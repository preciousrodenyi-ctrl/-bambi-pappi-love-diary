
import os
from datetime import datetime, timedelta
from uuid import uuid4
from io import BytesIO

from flask import (
    Flask, request, jsonify, session,
    send_from_directory
)
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError

load_dotenv()

app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

if not app.config["SECRET_KEY"]:
    raise RuntimeError("SECRET_KEY missing from .env")

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///love_diary.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(hours=8)

app.config["UPLOAD_FOLDER"] = os.path.join(
    app.root_path, "uploads", "memories"
)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

db = SQLAlchemy(app)

CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.100.43:5173"
    ],
    supports_credentials=True
)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(30), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class DiaryEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PhotoMemory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(150), nullable=False)
    caption = db.Column(db.String(1000), nullable=True)
    created_by = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def logged_in_user():
    user_id = session.get("user_id")

    if not user_id:
        return None

    user = db.session.get(User, user_id)

    if not user:
        session.clear()

    return user


@app.errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "Photo must be 5 MB or smaller"}), 413


@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to Bambi & Pappi's Love Diary ❤️"
    })


@app.route("/api/health")
def health():
    return jsonify({"status": "healthy"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    username = data.get("username", "")
    password = data.get("password", "")

    if not isinstance(username, str) or not isinstance(password, str):
        return jsonify({"error": "Invalid login details"}), 400

    username = username.strip().lower()

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password"}), 401

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Login successful",
        "username": user.username
    })


@app.route("/api/me")
def me():
    user = logged_in_user()

    if not user:
        return jsonify({"error": "Please log in"}), 401

    return jsonify({"username": user.username})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"})


@app.route("/api/private")
def private():
    user = logged_in_user()

    if not user:
        return jsonify({"error": "Login required"}), 401

    return jsonify({
        "message": "Welcome to your private love diary ❤️"
    })


@app.route("/api/entries", methods=["GET", "POST"])
def entries():
    user = logged_in_user()

    if not user:
        return jsonify({"error": "Please log in"}), 401

    if request.method == "GET":
        kind = request.args.get("kind")

        query = DiaryEntry.query

        if kind:
            if kind not in ["memory", "letter"]:
                return jsonify({"error": "Invalid entry type"}), 400
            query = query.filter_by(kind=kind)

        saved_entries = query.order_by(
            DiaryEntry.created_at.desc()
        ).all()

        return jsonify([
            {
                "id": entry.id,
                "kind": entry.kind,
                "title": entry.title,
                "content": entry.content,
                "created_by": entry.created_by,
                "created_at": entry.created_at.isoformat()
            }
            for entry in saved_entries
        ])

    data = request.get_json(silent=True) or {}

    kind = data.get("kind")
    title = data.get("title")
    content = data.get("content")

    if kind not in ["memory", "letter"]:
        return jsonify({"error": "Invalid entry type"}), 400

    if not isinstance(title, str) or not isinstance(content, str):
        return jsonify({"error": "Title and content are required"}), 400

    title = title.strip()
    content = content.strip()

    if not title or not content:
        return jsonify({"error": "Please enter a title and content"}), 400

    if len(title) > 150 or len(content) > 10000:
        return jsonify({"error": "Entry is too long"}), 400

    entry = DiaryEntry(
        kind=kind,
        title=title,
        content=content,
        created_by=user.username
    )

    db.session.add(entry)
    db.session.commit()

    return jsonify({
        "message": "Entry saved successfully",
        "id": entry.id,
        "kind": entry.kind,
        "title": entry.title,
        "content": entry.content,
        "created_by": entry.created_by,
        "created_at": entry.created_at.isoformat()
    }), 201


@app.route("/api/photos", methods=["GET", "POST"])
def photos():
    user = logged_in_user()

    if not user:
        return jsonify({"error": "Please log in"}), 401

    if request.method == "GET":
        saved_photos = PhotoMemory.query.order_by(
            PhotoMemory.created_at.desc()
        ).all()

        return jsonify([
            {
                "id": photo.id,
                "title": photo.title,
                "caption": photo.caption,
                "filename": photo.filename,
                "image_url": f"/api/photos/{photo.filename}",
                "created_by": photo.created_by,
                "created_at": photo.created_at.isoformat()
            }
            for photo in saved_photos
        ])

    photo_file = request.files.get("photo")
    title = request.form.get("title", "").strip()
    caption = request.form.get("caption", "").strip()

    if not photo_file or not photo_file.filename:
        return jsonify({"error": "Please select a photo"}), 400

    if not title:
        return jsonify({"error": "Please enter a photo title"}), 400

    if len(title) > 150 or len(caption) > 1000:
        return jsonify({"error": "Title or caption is too long"}), 400

    try:
        image = Image.open(photo_file.stream)

        if image.format not in ["JPEG", "PNG", "WEBP"]:
            return jsonify({
                "error": "Only JPEG, PNG and WebP photos are allowed"
            }), 400

        image.verify()

        photo_file.stream.seek(0)

        image = Image.open(photo_file.stream)
        image.load()

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return jsonify({"error": "Invalid or unsupported image"}), 400

    extension = {
        "JPEG": ".jpg",
        "PNG": ".png",
        "WEBP": ".webp"
    }[image.format]

    filename = f"{uuid4().hex}{extension}"
    upload_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    try:
        image.save(upload_path, format=image.format)

        photo = PhotoMemory(
            filename=filename,
            title=title,
            caption=caption,
            created_by=user.username
        )

        db.session.add(photo)
        db.session.commit()

    except Exception:
        db.session.rollback()

        if os.path.exists(upload_path):
            os.remove(upload_path)

        app.logger.exception("Photo upload failed")
        return jsonify({"error": "Could not save photo"}), 500

    return jsonify({
        "message": "Photo uploaded successfully ❤️",
        "id": photo.id,
        "title": photo.title,
        "caption": photo.caption,
        "filename": photo.filename,
        "image_url": f"/api/photos/{photo.filename}",
        "created_by": photo.created_by,
        "created_at": photo.created_at.isoformat()
    }), 201


@app.route("/api/photos/<filename>")
def serve_photo(filename):
    user = logged_in_user()

    if not user:
        return jsonify({"error": "Please log in"}), 401

    photo = PhotoMemory.query.filter_by(filename=filename).first()

    if not photo:
        return jsonify({"error": "Photo not found"}), 404

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        photo.filename,
        max_age=0
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(host="0.0.0.0", debug=True, port=5000)
