
import { useEffect, useState } from "react";
import {
  Heart,
  Camera,
  Mail,
  CalendarDays,
  Eye,
  EyeOff,
  LogOut,
  LockKeyhole,
  BookHeart,
  Sparkles,
  ImagePlus,
  Bell,
} from "lucide-react";
import "./App.css";

const API = `http://${window.location.hostname}:5000`;

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [entryMessage, setEntryMessage] = useState("");

  // Photo memory states
  const [photos, setPhotos] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const anniversary = new Date("2026-07-17T00:00:00");
  const daysTogether = Math.max(
    0,
    Math.floor((new Date() - anniversary) / 86400000)
  );

  async function checkLogin() {
    try {
      const response = await fetch(`${API}/api/me`, {
        credentials: "include",
      });

      if (!response.ok) return;

      const data = await response.json();
      setCurrentUser(data.username);
      setLoggedIn(true);
    } catch {
      setError("Cannot connect to the server.");
    }
  }

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    if (!loggedIn || !["memories", "letters"].includes(activeTab)) {
      return;
    }

    loadEntries();

    if (activeTab === "memories") {
      loadPhotos();
    }
  }, [loggedIn, activeTab]);

  async function loadEntries() {
    const kind = activeTab === "memories" ? "memory" : "letter";

    setEntryError("");

    try {
      const response = await fetch(
        `${API}/api/entries?kind=${kind}`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load entries");
      }

      setEntries(data);
    } catch (err) {
      setEntryError(err.message);
    }
  }

  async function loadPhotos() {
    setPhotoError("");

    try {
      const response = await fetch(`${API}/api/photos`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load photos");
      }

      setPhotos(data);
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  async function uploadPhoto(event) {
    event.preventDefault();

    if (!photoFile) {
      setPhotoError("Please choose a photo first.");
      return;
    }

    setPhotoSaving(true);
    setPhotoError("");
    setPhotoMessage("");

    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("title", photoTitle);
    formData.append("caption", photoCaption);

    try {
      const response = await fetch(`${API}/api/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not upload photo");
      }

      setPhotoTitle("");
      setPhotoCaption("");
      setPhotoFile(null);

      const fileInput = document.getElementById("memory-photo");
      if (fileInput) fileInput.value = "";

      setPhotoMessage("Your special photo has been saved! ❤️");

      await loadPhotos();
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      setCurrentUser(data.username);
      setLoggedIn(true);
      setPassword("");
      setActiveTab("home");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Check both terminals."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      setError("Could not contact the server.");
    }

    setLoggedIn(false);
    setCurrentUser("");
    setUsername("");
    setPassword("");
    setEntries([]);
    setPhotos([]);
    setPhotoFile(null);
    setActiveTab("home");
  }

  async function saveEntry(event) {
    event.preventDefault();

    setSaving(true);
    setEntryError("");
    setEntryMessage("");

    const kind = activeTab === "memories" ? "memory" : "letter";

    try {
      const response = await fetch(`${API}/api/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ kind, title, content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save entry");
      }

      setTitle("");
      setContent("");
      setEntryMessage("Your entry has been saved successfully.");

      await loadEntries();
    } catch (err) {
      setEntryError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function renderEntryForm(kind) {
    return (
      <form className="entry-form" onSubmit={saveEntry}>
        <h3>
          {kind === "memory"
            ? "Add a special memory"
            : "Write a love letter"}
          <Heart size={18} />
        </h3>

        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            kind === "memory"
              ? "Our first date..."
              : "To my favourite person..."
          }
          maxLength={120}
          required
        />

        <label>Your message</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write from your heart..."
          maxLength={5000}
          rows={5}
          required
        />

        {entryError && <p className="error">{entryError}</p>}
        {entryMessage && (
          <p className="success-message">{entryMessage}</p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save to our diary"}
        </button>
      </form>
    );
  }

  function renderPhotoForm() {
    return (
      <form className="entry-form" onSubmit={uploadPhoto}>
        <h3>
          Add a photo memory
          <ImagePlus size={19} />
        </h3>

        <label>Choose a photo</label>
        <input
          id="memory-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          required
        />

        <label>Photo title</label>
        <input
          value={photoTitle}
          onChange={(e) => setPhotoTitle(e.target.value)}
          placeholder="Our beautiful day..."
          maxLength={150}
          required
        />

        <label>Caption</label>
        <textarea
          value={photoCaption}
          onChange={(e) => setPhotoCaption(e.target.value)}
          placeholder="What made this moment special?"
          maxLength={1000}
          rows={3}
        />

        <p className="muted">
          JPEG, PNG or WebP. Maximum size: 5 MB.
        </p>

        {photoError && <p className="error">{photoError}</p>}

        {photoMessage && (
          <p className="success-message">{photoMessage}</p>
        )}

        <button type="submit" disabled={photoSaving}>
          {photoSaving ? "Uploading..." : "Save our photo ❤️"}
        </button>
      </form>
    );
  }

  function renderPhotoGallery() {
    if (photoError && photos.length === 0) {
      return <p className="error">{photoError}</p>;
    }

    if (photos.length === 0) {
      return (
        <div className="empty-card">
          <Camera size={30} />
          <h3>No photos saved yet</h3>
          <p>Upload your first special picture together.</p>
        </div>
      );
    }

    return (
      <div className="entries-list">
        {photos.map((photo) => (
          <article className="entry-card" key={photo.id}>
            <img
              src={`${API}${photo.image_url}`}
              alt={photo.title}
              style={{
                width: "100%",
                maxHeight: "350px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "12px",
              }}
            />

            <h3>{photo.title}</h3>
            {photo.caption && <p>{photo.caption}</p>}

            <small>
              Added by {photo.created_by} ·{" "}
              {new Date(photo.created_at).toLocaleDateString()}
            </small>
          </article>
        ))}
      </div>
    );
  }

  function renderContent() {
    if (activeTab === "memories" || activeTab === "letters") {
      const isMemory = activeTab === "memories";

      return (
        <section className="content-section">
          <p className="eyebrow">THE LITTLE THINGS WE KEEP</p>

          <h2>
            {isMemory ? "Our Memories" : "Our Love Letters"}
            {isMemory ? <Camera size={25} /> : <Mail size={25} />}
          </h2>

          <p className="muted">
            {isMemory
              ? "Every special moment deserves a place in our story."
              : "Words from the heart, saved for us."}
          </p>

          {isMemory && renderPhotoForm()}

          {isMemory && (
            <>
              <h3 className="saved-heading">Our photo gallery</h3>
              {renderPhotoGallery()}
            </>
          )}

          {renderEntryForm(isMemory ? "memory" : "letter")}

          <h3 className="saved-heading">
            Our saved {isMemory ? "memories" : "letters"}
          </h3>

          {entryError ? (
            <p className="error">{entryError}</p>
          ) : entries.length === 0 ? (
            <div className="empty-card">
              <Heart size={30} />
              <h3>Nothing here yet</h3>
              <p>Be the first to add something special.</p>
            </div>
          ) : (
            <div className="entries-list">
              {entries.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <h3>{entry.title}</h3>
                  <p>{entry.content}</p>
                  <small>
                    Added by {entry.created_by} ·{" "}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeTab === "story") {
      return (
        <section className="content-section">
          <p className="eyebrow">CHAPTERS OF US</p>
          <h2>
            Our Story <BookHeart size={25} />
          </h2>

          <div className="timeline">
            <div className="timeline-item">
              <span><Heart size={19} /></span>
              <div>
                <h3>Our special day</h3>
                <p>17 July 2026</p>
                <small>The beginning of this beautiful chapter.</small>
              </div>
            </div>

            <div className="timeline-item">
              <span><Sparkles size={19} /></span>
              <div>
                <h3>Our forever story</h3>
                <p>Still being written...</p>
                <small>One memory, one smile, one day at a time.</small>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="content-section">
        <p className="eyebrow">WELCOME TO YOUR LITTLE WORLD</p>
        <h2>
          Our love, our story. <Heart size={25} />
        </h2>

        <p className="muted">
          Every day is another beautiful page in our story.
        </p>

        <div className="anniversary-card">
          <Heart className="big-heart" size={38} />
          <p className="eyebrow">SINCE 17 JULY 2026</p>
          <h3>{daysTogether} days</h3>
          <p>of love, laughter and us.</p>
          <div className="date-label">
            PRECIOUS & SAM · FOREVER
          </div>
        </div>

        <div className="dashboard-grid">
          <button
            className="feature-card"
            onClick={() => setActiveTab("memories")}
          >
            <Camera size={27} />
            <h3>Our Memories</h3>
            <p>Pictures and little moments.</p>
          </button>

          <button
            className="feature-card"
            onClick={() => setActiveTab("letters")}
          >
            <Mail size={27} />
            <h3>Love Letters</h3>
            <p>Words meant just for us.</p>
          </button>

          <button
            className="feature-card"
            onClick={() => setActiveTab("story")}
          >
            <CalendarDays size={27} />
            <h3>Our Story</h3>
            <p>Our journey together.</p>
          </button>
        </div>
      </section>
    );
  }

  return (
    <main className="app">
      {!loggedIn ? (
        <>
          <nav className="navbar">
            <h2>Bambi <span>&</span> Pappi</h2>
            <p>OUR LITTLE WORLD</p>
          </nav>

          <section className="login-card">
            <div className="heart">
              <Heart size={30} />
            </div>

            <p className="eyebrow">A PLACE JUST FOR US</p>

            <h1>
              Welcome to our <span>Love Diary</span>
            </h1>

            <p className="intro">
              Every love story is beautiful, but ours is my favourite.
            </p>

            <form onSubmit={handleLogin}>
              <label>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter precious or sam"
                autoComplete="username"
                required
              />

              <label>Password</label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your secret password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword
                    ? <EyeOff size={19} />
                    : <Eye size={19} />}
                </button>
              </div>

              {error && <p className="error">{error}</p>}

              <button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Enter our world"}
              </button>
            </form>

            <p className="private-note">
              <LockKeyhole size={14} />
              Only Precious & Sam can enter
            </p>
          </section>

          <footer>Made with love, for Bambi & Pappi</footer>
        </>
      ) : (
        <>
          <nav className="navbar dashboard-navbar">
            <h2>Bambi <span>&</span> Pappi</h2>

            <div className="user-info">
              <span>Welcome, {currentUser}</span>
              <button className="logout-button" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          </nav>

          <div className="dashboard">
            <aside className="sidebar">
              <p className="eyebrow">OUR LITTLE WORLD</p>

              <button onClick={() => setActiveTab("home")}>
                <Heart size={17} /> Overview
              </button>

              <button onClick={() => setActiveTab("memories")}>
                <Camera size={17} /> Memories
              </button>

              <button onClick={() => setActiveTab("letters")}>
                <Mail size={17} /> Love letters
              </button>

              <button onClick={() => setActiveTab("story")}>
                <CalendarDays size={17} /> Our story
              </button>
            </aside>

            <div className="main-content">
              {renderContent()}
            </div>
          </div>

          <footer>Two hearts. One beautiful story.</footer>
        </>
      )}
    </main>
  );
}

export default App;
