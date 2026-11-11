
from getpass import getpass
from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    db.create_all()

    accounts = ["precious", "sam"]

    for username in accounts:
        existing = User.query.filter_by(username=username).first()

        if existing:
            print(f"Account '{username}' already exists.")
            continue

        print(f"\nCreate a password for {username.capitalize()}.")
        password = getpass("Enter password (minimum 12 characters): ")
        confirm = getpass("Confirm password: ")

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            continue

        if password != confirm:
            print("Passwords do not match.")
            continue

        user = User(
            username=username,
            password_hash=generate_password_hash(password)
        )

        db.session.add(user)
        db.session.commit()

        print(f"Account '{username}' created successfully!")

    print("\nAccount setup finished.")
