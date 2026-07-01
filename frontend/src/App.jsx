import { useState, useEffect } from "react";
import {
  registerUser, loginUser, getMyProfile, updatePreference,
  writeConfession, getMyConfessions, deleteConfession,
  getDiscover, swipeUser, getMatches, getMessages, sendMessage,
  getLikesReceived, getPassedProfiles, getLikedProfiles, undoSwipe,
} from "./api";
import "./App.css";

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [filterArea, setFilterArea] = useState("");
  const [matchPopup, setMatchPopup] = useState(null); // { name } ya null
  const [genericMsg, setGenericMsg] = useState(null); // chote messages ke liye
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [page, setPage] = useState("discover");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupCity, setSetupCity] = useState("");
  const [setupArea, setSetupArea] = useState("");
  const [setupLookingFor, setSetupLookingFor] = useState("any");
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [likesReceived, setLikesReceived] = useState([]);
const [passedProfiles, setPassedProfiles] = useState([]);
const [likedProfiles, setLikedProfiles] = useState([]);
const [myUserId, setMyUserId] = useState(null);
  // auth fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("female");
  const [authMsg, setAuthMsg] = useState("");
  const [authMode, setAuthMode] = useState("register");

  // profile
  const [profile, setProfile] = useState(null);
  const [prefDraft, setPrefDraft] = useState("any");

  // confession
  const [confessionText, setConfessionText] = useState("");
  const [myConfessions, setMyConfessions] = useState([]);

  // discover
  const [candidates, setCandidates] = useState([]);
  const [discoverMsg, setDiscoverMsg] = useState("");
  const [filterGender, setFilterGender] = useState("any");

  // matches & chat
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  async function handleRegister() {
    const result = await registerUser(name, email, password, gender);
    setAuthMsg(result.message || "Error");
  }

  async function handleLogin() {
    const result = await loginUser(email, password);
    if (result.access_token) {
      localStorage.setItem("token", result.access_token);
      setLoggedIn(true);

      const profileResult = await getMyProfile();
      setMyUserId(profileResult.id);
      if (!profileResult.city) {
        setNeedsSetup(true);
      } else {
        setFilterCity(profileResult.city);
        setFilterGender(profileResult.looking_for);
      }
    } else {
      setAuthMsg("Login failed");
    }
  }

  function handleLogout() {
  localStorage.removeItem("token");
  setLoggedIn(false);
  setPage("discover");
  setName("");
  setEmail("");
  setPassword("");
  setGender("female");
  setAuthMsg("");
  setNeedsSetup(false);
  setSetupCity("");
  setSetupArea("");
  setShowLanding(true);  // naya
}

  async function loadProfile() {
    const result = await getMyProfile();
    setProfile(result);
    setPrefDraft(result.looking_for);
  }

  async function handleCompleteSetup() {
    if (!setupCity.trim() || !setupLookingFor) {
      alert("City and preference are required!");
      return;
    }
    await updatePreference(setupLookingFor, setupCity, setupArea);
    setNeedsSetup(false);
    setFilterCity(setupCity);
    setFilterGender(setupLookingFor);
  }

  async function handleSavePreference() {
  await updatePreference(prefDraft, undefined, undefined);
  loadProfile();
  setGenericMsg("Preference updated!");
  setTimeout(() => setGenericMsg(null), 2000);
}

  async function handleWriteConfession() {
  const result = await writeConfession(confessionText);
  if (result.detail) {
    setGenericMsg(result.detail);
    setTimeout(() => setGenericMsg(null), 2500);
    return;
  }
  setConfessionText("");
  setGenericMsg("Confession posted!");
  setTimeout(() => setGenericMsg(null), 2000);
  if (page === "myconfessions") loadMyConfessions();
}

  async function loadMyConfessions() {
    const result = await getMyConfessions();
    setMyConfessions(Array.isArray(result) ? result : []);
  }

  async function handleDeleteConfession(id) {
    await deleteConfession(id);
    setMyConfessions(myConfessions.filter((c) => c.id !== id));
  }

  async function loadDiscover() {
  setLoadingDiscover(true);
  const result = await getDiscover(filterCity, filterArea);
  if (Array.isArray(result)) {
    setCandidates(result);
    setDiscoverMsg("");
  } else {
    setCandidates([]);
    setDiscoverMsg(result.message || "No more profiles");
  }
  setLoadingDiscover(false);
}

  async function handleApplyDiscoverFilters() {
    loadDiscover();
  }

  async function handleSwipe(targetId, liked) {
  const result = await swipeUser(targetId, liked);
  if (result.message === "It's a match!") {
    const candidate = [...candidates, ...likesReceived, ...passedProfiles].find((c) => c.user_id === targetId);
    setMatchPopup({ name: candidate?.name || "Someone" });
  } else {
    setGenericMsg(result.message);
    setTimeout(() => setGenericMsg(null), 2000);
  }
  setCandidates(candidates.filter((c) => c.user_id !== targetId));
  setLikesReceived(likesReceived.filter((c) => c.user_id !== targetId));
  setPassedProfiles(passedProfiles.filter((c) => c.user_id !== targetId));
}

  async function loadMatches() {
    const result = await getMatches();
    setMatches(Array.isArray(result) ? result : []);
  }

  async function openChat(match) {
    setActiveMatch(match);
    const result = await getMessages(match.match_id);
    setMessages(Array.isArray(result) ? result : []);
  }
  async function loadLikedProfiles() {
  const result = await getLikedProfiles();
  setLikedProfiles(Array.isArray(result) ? result : []);
}

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    await sendMessage(activeMatch.match_id, newMessage);
    setNewMessage("");
    const result = await getMessages(activeMatch.match_id);
    setMessages(Array.isArray(result) ? result : []);
  }
  async function loadLikesReceived() {
  const result = await getLikesReceived();
  setLikesReceived(Array.isArray(result) ? result : []);
}

async function loadPassedProfiles() {
  const result = await getPassedProfiles();
  setPassedProfiles(Array.isArray(result) ? result : []);
}

  useEffect(() => {
  if (!loggedIn || needsSetup) return;
  if (page === "discover") loadDiscover();
  if (page === "matches") loadMatches();
  if (page === "myconfessions") loadMyConfessions();
  if (page === "profile") loadProfile();
  if (page === "likes") loadLikesReceived();
  if (page === "passed") loadPassedProfiles();
  if (page === "liked") loadLikedProfiles();
}, [loggedIn, page, needsSetup]);

  // ---------- LANDING PAGE ----------
if (showLanding && !loggedIn) {
  localStorage.removeItem("token");
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-brand">KakshMate</h1>
        <p className="landing-tagline">Find your kakshmate through your flaws, not your filters.</p>
        <p className="landing-desc">
          Write anonymous confessions about your living habits. Discover roommates who'll accept you for who you really are.
        </p>
        <button className="btn btn-primary landing-btn" onClick={() => setShowLanding(false)}>
          Get Started
        </button>
      </div>
    </div>
  );
}

  // ---------- LOGIN / REGISTER SCREEN ----------
  if (!loggedIn) {
    return (
      <div className="auth-container">
        <h1 className="brand"> KakshMate</h1>
        <p className="tagline">Find your flatmate through your flaws, not your filters.</p>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={authMode === "register" ? "tab-btn active" : "tab-btn"}
              onClick={() => {
                setAuthMode("register");
                setEmail("");
                setPassword("");
                setName("");
                setAuthMsg("");
              }}
            >
              Register
            </button>
            <button
              className={authMode === "login" ? "tab-btn active" : "tab-btn"}
              onClick={() => {
                setAuthMode("login");
                setEmail("");
                setPassword("");
                setAuthMsg("");
              }}
            >
              Login
            </button>
          </div>

          {authMode === "register" && (
            <>
              <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">I am: Female</option>
                <option value="male">I am: Male</option>
              </select>
              <button className="btn btn-primary" onClick={handleRegister}>Register</button>
            </>
          )}

          {authMode === "login" && (
            <>
              <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="btn btn-primary" onClick={handleLogin}>Login</button>
            </>
          )}

          {authMsg && <p className="msg">{authMsg}</p>}
        </div>
      </div>
    );
  }

  // ---------- MANDATORY SETUP SCREEN (first login only) ----------
  if (needsSetup) {
    return (
      <div className="auth-container">
        <h1 className="brand">One last step</h1>
        <p className="tagline">Tell us where you are and who you're looking for</p>

        <div className="auth-card">
          <input className="input" placeholder="City (required)" value={setupCity} onChange={(e) => setSetupCity(e.target.value)} />
          <input className="input" placeholder="Area (optional)" value={setupArea} onChange={(e) => setSetupArea(e.target.value)} />

          <select className="input" value={setupLookingFor} onChange={(e) => setSetupLookingFor(e.target.value)}>
            <option value="female">Looking for: Female</option>
            <option value="male">Looking for: Male</option>
            <option value="any">Looking for: Any</option>
          </select>

          <button className="btn btn-primary" onClick={handleCompleteSetup}>Continue</button>
        </div>
      </div>
    );
  }

  // ---------- MAIN APP (after login + setup) ----------
  return (
    
    <div className="app-container">
      {matchPopup && (
        <div className="modal-overlay" onClick={() => setMatchPopup(null)}>
          <div className="match-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 It's a Match!</h2>
            <p>You and {matchPopup.name} liked each other.</p>
            <button className="btn btn-primary" onClick={() => { setMatchPopup(null); setPage("matches"); }}>
              Start Chatting
            </button>
            <button className="btn btn-secondary" onClick={() => setMatchPopup(null)}>
              Keep Swiping
            </button>
          </div>
        </div>
      )}

      {genericMsg && <div className="toast">{genericMsg}</div>}
      <header className="navbar">
        <h2 className="brand-small">KakshMate</h2>
        <nav>
  <button className={page === "discover" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("discover")}>Discover</button>
  <button className={page === "likes" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("likes")}>Likes</button>
  <button className={page === "liked" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("liked")}>Liked</button>
  <button className={page === "passed" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("passed")}>Passed</button>
  <button className={page === "confess" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("confess")}>Write</button>
  <button className={page === "myconfessions" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("myconfessions")}>My Confessions</button>
  <button className={page === "matches" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("matches")}>Matches</button>
  <button className={page === "profile" ? "nav-btn active" : "nav-btn"} onClick={() => setPage("profile")}>Profile</button>
  <button className="nav-btn logout" onClick={handleLogout}>Logout</button>
</nav>
      </header>

      <main className="main-content">

        {page === "confess" && (
          <div className="card">
            <h3>Write a confession</h3>
            <textarea
  className="textarea"
  placeholder="I always leave dishes in the sink..."
  value={confessionText}
  onChange={(e) => setConfessionText(e.target.value)}
  maxLength={500}
/>
<p className="char-count">{confessionText.length}/500</p>
<button className="btn btn-primary" onClick={handleWriteConfession}>Post Confession</button>
            
          </div>
        )}

        {page === "myconfessions" && (
          <div className="card">
            <h3>My Confessions</h3>
            {myConfessions.length === 0 && <p className="empty">You haven't written any confessions yet.</p>}
            {myConfessions.map((c) => (
              <div className="my-confession-row" key={c.id}>
                <p className="confession-text">"{c.text}"</p>
                <button className="btn btn-pass btn-small" onClick={() => handleDeleteConfession(c.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {page === "discover" && (
          <div className="discover-grid">
            <div className="filter-bar">
              <input
                className="input"
                placeholder="Filter by city..."
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              />
              <input
               className="input"
               placeholder="Filter by area..."
               value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
  />
              <select className="input" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                <option value="female">Looking for: Female</option>
                <option value="male">Looking for: Male</option>
                <option value="any">Looking for: Any</option>
              </select>
              <button className="btn btn-secondary" onClick={handleApplyDiscoverFilters}>Apply Filters</button>
            </div>

            {loadingDiscover && <p className="msg">Loading profiles...</p>}
            {!loadingDiscover && discoverMsg && <p className="msg">{discoverMsg}</p>}
            {candidates.map((c) => {
  const initials = c.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const bgColors = ["#e07b39", "#2a9d6a", "#7c5cbf", "#c9851a", "#1a7abf"];
  const bg = bgColors[c.user_id % bgColors.length];
  return (
    <div className="profile-card" key={c.user_id}>
      <div className="card-photo" style={{ background: `linear-gradient(135deg, ${bg}22, ${bg}44)` }}>
        <div className="avatar-circle" style={{ background: bg }}>{initials}</div>
        <span className="gender-badge">{c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : ""}</span>
      </div>
      <div className="card-body">
        <p className="card-name">{c.name}</p>
        {c.city && (
          <div className="city-tag">
            <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true"></i>
            {c.city}{c.area ? `, ${c.area}` : ""}
          </div>
        )}
        <p className="confessions-label">Confessions</p>
        <div className="confession-list">
          {c.confessions.length === 0 ? (
            <p className="empty">No confessions yet</p>
          ) : (
            c.confessions.slice(0, 2).map((text, i) => (
              <p className="confession-text" key={i}>"{text}"</p>
            ))
          )}
          {c.confessions.length > 2 && (
            <p className="empty">+ {c.confessions.length - 2} more</p>
          )}
        </div>
        <div className="swipe-row">
          <button className="btn btn-pass" onClick={() => handleSwipe(c.user_id, false)}>Pass</button>
          <button className="btn btn-like" onClick={() => handleSwipe(c.user_id, true)}>Like</button>
        </div>
      </div>
    </div>
  );
})}
          </div>
        )}
        {page === "likes" && (
  <div className="discover-grid">
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
      <h3 style={{ color: "#1a1a1a" }}>People who liked you</h3>
    </div>
    {likesReceived.length === 0 && <p className="empty" style={{ gridColumn: "1 / -1" }}>No likes yet. Keep posting confessions!</p>}
    {likesReceived.map((c) => {
      const initials = c.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const bgColors = ["#e07b39", "#2a9d6a", "#7c5cbf", "#c9851a", "#1a7abf"];
      const bg = bgColors[c.user_id % bgColors.length];
      return (
        <div className="profile-card" key={c.user_id}>
          <div className="card-photo" style={{ background: `linear-gradient(135deg, ${bg}22, ${bg}44)` }}>
            <div className="avatar-circle" style={{ background: bg }}>{initials}</div>
          </div>
          <div className="card-body">
            <p className="card-name">{c.name}</p>
            {c.city && (
              <div className="city-tag">
                <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true"></i>
                {c.city}{c.area ? `, ${c.area}` : ""}
              </div>
            )}
            <p className="confessions-label">Confessions</p>
            <div className="confession-list">
              {c.confessions.length === 0 ? (
                <p className="empty">No confessions yet</p>
              ) : (
                c.confessions.slice(0, 2).map((text, i) => (
                  <p className="confession-text" key={i}>"{text}"</p>
                ))
              )}
              {c.confessions.length > 2 && (
                <p className="empty">+ {c.confessions.length - 2} more</p>
              )}
            </div>
            <div className="swipe-row">
              <button className="btn btn-pass" onClick={() => handleSwipe(c.user_id, false)}>Pass</button>
              <button className="btn-like-back" onClick={() => handleSwipe(c.user_id, true)}>Like Back</button>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
{page === "liked" && (
  <div className="discover-grid">
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
      <h3 style={{ color: "#1a1a1a" }}>Profiles you liked</h3>
    </div>
    {likedProfiles.length === 0 && <p className="empty" style={{ gridColumn: "1 / -1" }}>You haven't liked anyone yet.</p>}
    {likedProfiles.map((c) => {
      const initials = c.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const bgColors = ["#e07b39", "#2a9d6a", "#7c5cbf", "#c9851a", "#1a7abf"];
      const bg = bgColors[c.user_id % bgColors.length];
      return (
        <div className="profile-card" key={c.user_id}>
          <div className="card-photo" style={{ background: `linear-gradient(135deg, ${bg}22, ${bg}44)` }}>
            <div className="avatar-circle" style={{ background: bg }}>{initials}</div>
          </div>
          <div className="card-body">
            <p className="card-name">{c.name}</p>
            {c.city && (
              <div className="city-tag">
                <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true"></i>
                {c.city}{c.area ? `, ${c.area}` : ""}
              </div>
            )}
            <p className="confessions-label">Confessions</p>
            <div className="confession-list">
              {c.confessions.length === 0 ? (
                <p className="empty">No confessions yet</p>
              ) : (
                c.confessions.slice(0, 2).map((text, i) => (
                  <p className="confession-text" key={i}>"{text}"</p>
                ))
              )}
              {c.confessions.length > 2 && (
                <p className="empty">+ {c.confessions.length - 2} more</p>
              )}
            </div>
            <button
              className="btn-unlike"
              style={{ width: "100%", marginTop: "4px" }}
              onClick={async () => {
    await undoSwipe(c.user_id);
    setLikedProfiles(likedProfiles.filter((p) => p.user_id !== c.user_id));
    await loadDiscover();
    setPage("discover");
  }}
            >
              Unlike
            </button>
          </div>
        </div>
      );
    })}
  </div>
)}

{page === "passed" && (
  <div className="discover-grid">
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
      <h3 style={{ color: "#1a1a1a" }}>Profiles you passed</h3>
    </div>
    {passedProfiles.length === 0 && <p className="empty" style={{ gridColumn: "1 / -1" }}>You haven't passed anyone yet.</p>}
    {passedProfiles.map((c) => {
      const initials = c.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const bgColors = ["#e07b39", "#2a9d6a", "#7c5cbf", "#c9851a", "#1a7abf"];
      const bg = bgColors[c.user_id % bgColors.length];
      return (
        <div className="profile-card" key={c.user_id}>
          <div className="card-photo" style={{ background: `linear-gradient(135deg, ${bg}22, ${bg}44)` }}>
            <div className="avatar-circle" style={{ background: bg }}>{initials}</div>
          </div>
          <div className="card-body">
            <p className="card-name">{c.name}</p>
            {c.city && (
              <div className="city-tag">
                <i className="ti ti-map-pin" style={{ fontSize: "13px" }} aria-hidden="true"></i>
                {c.city}{c.area ? `, ${c.area}` : ""}
              </div>
            )}
            <p className="confessions-label">Confessions</p>
            <div className="confession-list">
              {c.confessions.length === 0 ? (
                <p className="empty">No confessions yet</p>
              ) : (
                c.confessions.slice(0, 2).map((text, i) => (
                  <p className="confession-text" key={i}>"{text}"</p>
                ))
              )}
              {c.confessions.length > 2 && (
                <p className="empty">+ {c.confessions.length - 2} more</p>
              )}
            </div>
            <button
              className="btn btn-like"
              style={{ width: "100%", marginTop: "4px" }}
              onClick={async () => {
    await undoSwipe(c.user_id);
    setPassedProfiles(passedProfiles.filter((p) => p.user_id !== c.user_id));
    await loadDiscover();
    setPage("discover");
  }}
            >
              Changed my mind
            </button>
          </div>
        </div>
      );
    })}
  </div>
)}

        {page === "matches" && !activeMatch && (
          <div className="card">
            <h3>Your Matches</h3>
            {matches.length === 0 && <p className="empty">No matches yet. Keep swiping!</p>}
            {matches.map((m) => (
              <div className="match-row" key={m.match_id} onClick={() => openChat(m)}>
                <span>{m.name}</span>
                <span className="chat-link">Chat →</span>
              </div>
            ))}
          </div>
        )}

        {page === "matches" && activeMatch && (
          <div className="card chat-card">
            <button className="back-btn" onClick={() => setActiveMatch(null)}>← Back to matches</button>
            <h3>Chat with {activeMatch.name}</h3>
            <div className="messages-box">
  {messages.map((msg) => {
    const isMine = msg.sender_id === myUserId;
    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          justifyContent: isMine ? "flex-end" : "flex-start",
        }}
      >
        <p
          className="message-bubble"
          style={{
            background: isMine ? "#e07b39" : "#fdf0e8",
            color: isMine ? "#fff" : "#555",
            border: isMine ? "none" : "0.5px solid #e8e4de",
          }}
        >
          {msg.text}
        </p>
      </div>
    );
  })}
</div>
            <div className="chat-input-row">
              <input
                className="input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        )}

        {page === "profile" && profile && (
          <div className="card">
            <h3>My Profile</h3>
            <p className="profile-row"><strong>Name:</strong> {profile.name}</p>
            <p className="profile-row"><strong>Email:</strong> {profile.email}</p>
            <p className="profile-row"><strong>Gender:</strong> {profile.gender}</p>

            </div>
        )}

      </main>
    </div>
  );
}

export default App;