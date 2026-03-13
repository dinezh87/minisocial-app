import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { getThemeForDate } from "./themes";

const AUTH_API = process.env.REACT_APP_AUTH_URL || "http://localhost:3000";
const POST_API = process.env.REACT_APP_POST_URL || "http://localhost:8000";
const MEDIA_API = process.env.REACT_APP_MEDIA_URL || "http://localhost:8081";
const FEED_API = process.env.REACT_APP_FEED_URL || "http://localhost:8083";
const NOTIFICATION_API = process.env.REACT_APP_NOTIFICATION_URL || "http://localhost:8090";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
  const [birthplace, setBirthplace] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [viewingUserAliases, setViewingUserAliases] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [flashNotice, setFlashNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [theme, setTheme] = useState(() => getThemeForDate());
  const flashNoticeTimeoutRef = useRef(null);
  const postStreamRef = useRef(null);
  const notificationStreamRef = useRef(null);

  useEffect(() => {
    const syncTheme = () => setTheme(getThemeForDate());
    syncTheme();

    const intervalId = window.setInterval(syncTheme, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.fontFamily = '"Avenir Next", "Trebuchet MS", sans-serif';
    document.body.style.background = theme.pageBackground;
    document.body.style.color = theme.text;
    return () => {
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, [theme]);

  useEffect(() => {
    return () => {
      if (flashNoticeTimeoutRef.current) {
        window.clearTimeout(flashNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");
    const storedSex = localStorage.getItem("sex");
    const storedDob = localStorage.getItem("dob");
    const storedBirthplace = localStorage.getItem("birthplace");
    const storedCurrentCity = localStorage.getItem("currentCity");
    const storedProfilePic = localStorage.getItem("profilePic");
    if (token && storedUsername) {
      setUser({
        username: storedUsername,
        token,
        email: storedEmail,
        sex: storedSex,
        dob: storedDob,
        birthplace: storedBirthplace,
        currentCity: storedCurrentCity,
        profilePic: storedProfilePic,
      });
      setUsername(storedUsername);
      setSex(storedSex || "");
      setDob(storedDob || "");
      setBirthplace(storedBirthplace || "");
      setCurrentCity(storedCurrentCity || "");
      setProfilePic(storedProfilePic);
      fetchPosts();
    }
  }, []);

  useEffect(() => {
    const cityName = user?.currentCity || currentCity;

    if (!cityName) {
      setWeather(null);
      setWeatherError("");
      setWeatherLoading(false);
      return;
    }

    const controller = new AbortController();
    let intervalId = null;

    async function fetchWeather(signal) {
      try {
        setWeatherLoading(true);
        setWeatherError("");

        const weatherResponse = await fetch(
          `${FEED_API}/weather?city=${encodeURIComponent(cityName)}`,
          { signal }
        );

        if (!weatherResponse.ok) {
          throw new Error("Weather endpoint failed");
        }

        const weatherData = await weatherResponse.json();
        setWeather(weatherData);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.error("Weather fetch error:", err);
        setWeather(null);
        setWeatherError("Could not load today's weather.");
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    }

    fetchWeather(controller.signal);
    intervalId = window.setInterval(() => {
      fetchWeather(controller.signal);
    }, 60000);

    return () => {
      controller.abort();
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [user?.currentCity, currentCity]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, [user?.username, user?.email]);

  useEffect(() => {
    const identifiers = [user?.username, user?.email].filter(Boolean);

    if (identifiers.length === 0) {
      if (notificationStreamRef.current) {
        notificationStreamRef.current.close();
        notificationStreamRef.current = null;
      }
      return;
    }

    const stream = new EventSource(
      `${NOTIFICATION_API}/notifications/stream?identifiers=${encodeURIComponent(identifiers.join(","))}`
    );
    notificationStreamRef.current = stream;

    stream.addEventListener("notification", (event) => {
      try {
        const notification = JSON.parse(event.data);
        setNotifications((current) => {
          if (current.some((item) => item.id === notification.id)) {
            return current;
          }
          const nextNotification = showNotifications
            ? { ...notification, read: true }
            : notification;
          return [nextNotification, ...current];
        });
        setUnreadNotifications((count) => (showNotifications ? count : count + 1));
      } catch (err) {
        console.error("Error parsing live notification:", err);
      }
    });

    stream.onerror = () => {
      stream.close();
      notificationStreamRef.current = null;
    };

    return () => {
      stream.close();
      if (notificationStreamRef.current === stream) {
        notificationStreamRef.current = null;
      }
    };
  }, [user?.username, user?.email, showNotifications]);

  useEffect(() => {
    if (!user) {
      if (postStreamRef.current) {
        postStreamRef.current.close();
        postStreamRef.current = null;
      }
      return;
    }

    const stream = new EventSource(`${POST_API}/posts/stream`);
    postStreamRef.current = stream;

    stream.addEventListener("post_created", (event) => {
      try {
        const post = JSON.parse(event.data);
        setPosts((currentPosts) => {
          if (currentPosts.some((item) => (item.postId || item.content) === (post.postId || post.content))) {
            return currentPosts;
          }
          return [post, ...currentPosts];
        });
      } catch (err) {
        console.error("Error parsing live post event:", err);
      }
    });

    stream.onerror = () => {
      stream.close();
      postStreamRef.current = null;
    };

    return () => {
      stream.close();
      if (postStreamRef.current === stream) {
        postStreamRef.current = null;
      }
    };
  }, [user?.username]);

  const ui = useMemo(
    () => ({
      shell: {
        minHeight: "100vh",
        background: theme.pageBackground,
        color: theme.text,
        position: "relative",
        overflow: "hidden",
      },
      orbOne: {
        position: "absolute",
        width: "28rem",
        height: "28rem",
        borderRadius: "999px",
        background: theme.glow,
        filter: "blur(24px)",
        top: "-10rem",
        left: "-8rem",
        pointerEvents: "none",
      },
      orbTwo: {
        position: "absolute",
        width: "24rem",
        height: "24rem",
        borderRadius: "999px",
        background: theme.mode === "day" ? "rgba(15, 118, 110, 0.16)" : "rgba(167, 139, 250, 0.15)",
        filter: "blur(28px)",
        right: "-6rem",
        top: "9rem",
        pointerEvents: "none",
      },
      pageFrame: {
        position: "relative",
        maxWidth: "1280px",
        margin: "0 auto",
        minHeight: "100vh",
        background: theme.shellBackground,
        backdropFilter: "blur(18px)",
        borderLeft: `1px solid ${theme.shellBorder}`,
        borderRight: `1px solid ${theme.shellBorder}`,
        boxShadow: theme.cardShadow,
      },
      topBar: {
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: theme.topBar,
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${theme.topBarBorder}`,
      },
      brandMark: {
        width: "48px",
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`,
        color: "#fff",
        fontSize: "24px",
        fontWeight: "800",
        boxShadow: `0 16px 28px ${theme.glow}`,
        flexShrink: 0,
      },
      title: {
        margin: 0,
        fontSize: "26px",
        fontWeight: "800",
        letterSpacing: "0.02em",
      },
      pill: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 12px",
        borderRadius: "999px",
        background: theme.badge,
        color: theme.textMuted,
        fontSize: "12px",
        border: `1px solid ${theme.cardBorder}`,
      },
      container: {
        maxWidth: "1040px",
        margin: "0 auto",
        padding: "24px 20px 48px",
      },
      card: {
        background: theme.card,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: "24px",
        boxShadow: theme.cardShadow,
        backdropFilter: "blur(16px)",
      },
      input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        borderRadius: "14px",
        border: `1px solid ${theme.inputBorder}`,
        background: theme.input,
        color: theme.text,
        outline: "none",
        fontSize: "14px",
      },
      textarea: {
        width: "100%",
        minHeight: "120px",
        boxSizing: "border-box",
        padding: "16px",
        borderRadius: "18px",
        border: `1px solid ${theme.inputBorder}`,
        background: theme.input,
        color: theme.text,
        outline: "none",
        resize: "vertical",
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: "15px",
        lineHeight: "1.5",
      },
      primaryButton: {
        padding: "12px 20px",
        borderRadius: "14px",
        border: "none",
        background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`,
        color: "#fff",
        cursor: "pointer",
        fontWeight: "700",
        boxShadow: `0 16px 28px ${theme.glow}`,
      },
      secondaryButton: {
        padding: "10px 16px",
        borderRadius: "12px",
        border: `1px solid ${theme.inputBorder}`,
        background: theme.subtleSurface,
        color: theme.text,
        cursor: "pointer",
        fontWeight: "700",
      },
      iconButton: {
        width: "44px",
        height: "44px",
        borderRadius: "14px",
        border: `1px solid ${theme.inputBorder}`,
        background: theme.subtleSurface,
        color: theme.text,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      },
      linkButton: {
        background: "none",
        border: "none",
        color: theme.accent,
        cursor: "pointer",
        fontWeight: "700",
        padding: 0,
      },
      alert: {
        padding: "12px 14px",
        borderRadius: "14px",
        marginBottom: "16px",
        background: error.includes("success") || error.includes("created")
          ? theme.successBg
          : theme.errorBg,
        color: error.includes("success") || error.includes("created")
          ? theme.successText
          : theme.errorText,
      },
    }),
    [theme, error]
  );

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${POST_API}/posts`);
      setPosts(res.data);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  const getUserNotificationIdentifiers = () =>
    [user?.username, user?.email]
      .filter(Boolean)
      .map((value) => value.trim())
      .filter(Boolean);

  const fetchNotifications = async () => {
    const identifiers = getUserNotificationIdentifiers();
    if (identifiers.length === 0) return;

    try {
      setNotificationsLoading(true);
      const res = await axios.get(`${NOTIFICATION_API}/notifications`, {
        params: { identifiers: identifiers.join(",") },
      });
      setNotifications(res.data.notifications || []);
      setUnreadNotifications(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationsRead = async () => {
    const identifiers = getUserNotificationIdentifiers();
    if (identifiers.length === 0 || unreadNotifications === 0) return;

    try {
      await axios.post(`${NOTIFICATION_API}/notifications/read`, { identifiers });
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error("Error marking notifications read:", err);
    }
  };

  const showFlashNotice = (message, tone = "success") => {
    if (flashNoticeTimeoutRef.current) {
      window.clearTimeout(flashNoticeTimeoutRef.current);
    }

    setFlashNotice({ message, tone });
    flashNoticeTimeoutRef.current = window.setTimeout(() => {
      setFlashNotice(null);
      flashNoticeTimeoutRef.current = null;
    }, 2500);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const payload = isLogin ? { email, password } : { email, password, username, sex, dob, birthplace, currentCity };
      const res = await axios.post(`${AUTH_API}${endpoint}`, payload);

      if (isLogin) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("username", res.data.username);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("sex", res.data.sex || "");
        localStorage.setItem("dob", res.data.dob || "");
        localStorage.setItem("birthplace", res.data.birthplace || "");
        localStorage.setItem("currentCity", res.data.currentCity || "");
        localStorage.setItem("profilePic", res.data.profilePic || "");
        setUser({
          username: res.data.username,
          token: res.data.token,
          email: res.data.email,
          sex: res.data.sex,
          dob: res.data.dob,
          birthplace: res.data.birthplace,
          currentCity: res.data.currentCity,
          profilePic: res.data.profilePic,
        });
        setUsername(res.data.username);
        setSex(res.data.sex || "");
        setDob(res.data.dob || "");
        setBirthplace(res.data.birthplace || "");
        setCurrentCity(res.data.currentCity || "");
        setProfilePic(res.data.profilePic);
        fetchPosts();
      } else {
        setError("Account created! Please login.");
        setIsLogin(true);
      }
      setEmail("");
      setPassword("");
      setUsername("");
      setSex("");
      setDob("");
      setBirthplace("");
      setCurrentCity("");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("sex");
    localStorage.removeItem("dob");
    localStorage.removeItem("birthplace");
    localStorage.removeItem("currentCity");
    localStorage.removeItem("profilePic");
    setUser(null);
    setPosts([]);
    setShowProfile(false);
  };

  const handleMediaUpload = async () => {
    if (!mediaFile) return null;

    const formData = new FormData();
    formData.append("file", mediaFile);

    try {
      const res = await axios.post(`${MEDIA_API}/media/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      console.error("Error uploading media:", err);
      return null;
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await handleMediaUpload();
      }

      await axios.post(`${POST_API}/posts`, {
        content,
        author: user.username,
        mediaUrl,
      });

      setContent("");
      setMediaFile(null);
      fetchPosts();
    } catch (err) {
      setError("Error creating post");
      console.error("Error creating post:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postContent) => {
    try {
      const res = await axios.post(`${POST_API}/posts/${encodeURIComponent(postContent)}/like`, {
        actor: user.username,
      });
      if (res.data?.alreadyLiked) {
        showFlashNotice("You already liked this post.", "error");
        return;
      }
      fetchPosts();
      fetchNotifications();
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleShare = async (post) => {
    const postId = post.postId || post.content;
    if (!postId) {
      showFlashNotice("This post cannot be shared yet.", "error");
      return;
    }

    try {
      await axios.post(`${POST_API}/posts/${encodeURIComponent(postId)}/share`, {
        actor: user.username,
      });
      showFlashNotice("Post shared. Other users will see it in their feed.");
      fetchNotifications();
    } catch (err) {
      console.error("Error sharing post:", err);
      setError("Failed to share post");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleComment = async (postContent) => {
    const text = commentText[postContent];
    if (!text?.trim()) return;
    try {
      await axios.post(`${POST_API}/posts/${encodeURIComponent(postContent)}/comment`, {
        author: user.username,
        text,
      });
      setCommentText({ ...commentText, [postContent]: "" });
      fetchPosts();
      fetchNotifications();
    } catch (err) {
      console.error("Error commenting:", err);
    }
  };

  const handleLikeComment = async (postContent, commentIndex) => {
    try {
      await axios.post(`${POST_API}/posts/${encodeURIComponent(postContent)}/comment/${commentIndex}/like`, {
        actor: user.username,
      });
      fetchPosts();
      fetchNotifications();
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleReplyToComment = async (postContent, commentIndex) => {
    const text = replyText[`${postContent}-${commentIndex}`];
    if (!text?.trim()) return;
    try {
      await axios.post(`${POST_API}/posts/${encodeURIComponent(postContent)}/comment/${commentIndex}/reply`, {
        author: user.username,
        text,
      });
      setReplyText({ ...replyText, [`${postContent}-${commentIndex}`]: "" });
      setReplyingTo(null);
      fetchPosts();
      fetchNotifications();
    } catch (err) {
      console.error("Error replying:", err);
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(urlLower) || urlLower.includes("image");
  };

  const isVideo = (url) => {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(urlLower) || urlLower.includes("video");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let newProfilePic = profilePic;
      if (profilePicFile) {
        const formData = new FormData();
        formData.append("file", profilePicFile);
        const res = await axios.post(`${MEDIA_API}/media/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        newProfilePic = res.data;
      }

      await axios.put(
        `${AUTH_API}/profile`,
        { username, sex, dob, birthplace, currentCity, profilePic: newProfilePic },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      localStorage.setItem("username", username);
      localStorage.setItem("sex", sex);
      localStorage.setItem("dob", dob);
      localStorage.setItem("birthplace", birthplace);
      localStorage.setItem("currentCity", currentCity);
      localStorage.setItem("profilePic", newProfilePic || "");
      setUser({ ...user, username, sex, dob, birthplace, currentCity, profilePic: newProfilePic });
      setProfilePic(newProfilePic);
      setProfilePicFile(null);
      setError("Profile updated successfully!");
      setTimeout(() => setError(""), 3000);
    } catch (err) {
      setError("Failed to update profile");
      console.error("Profile update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const viewUserProfile = async (authorName) => {
    if (!authorName || authorName === "Anonymous") return;

    if (normalizeUsername(authorName) === normalizeUsername(user.username)) {
      setShowProfile(true);
      setViewingUser(null);
      setViewingUserAliases([]);
      return;
    }
    try {
      const res = await axios.get(`${AUTH_API}/user/${encodeURIComponent(authorName)}`);
      setViewingUserProfile(res.data);
      setViewingUser(res.data.username || authorName);
      setViewingUserAliases(
        [authorName, res.data.username, res.data.email].filter(Boolean)
      );
      setShowProfile(false);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load user profile");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    try {
      const res = await axios.get(`${AUTH_API}/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
      setShowSearchResults(res.data && res.data.length > 0);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    }
  };

  const selectSearchResult = (selectedUsername) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    viewUserProfile(selectedUsername);
  };

  const handleDeletePost = async (postContent) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await axios.delete(`${POST_API}/posts/${encodeURIComponent(postContent)}`);
      fetchPosts();
      showFlashNotice("Post deleted from your feed.");
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Failed to delete post");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getPostAuthor = (post) => post.author || post.username || post.user || "Anonymous";
  const getPostIdentifier = (post) => post.postId || post.content;

  const normalizeUsername = (value) => (value || "").trim().toLowerCase();

  const canDeletePost = (post) => {
    const author = getPostAuthor(post);
    return normalizeUsername(author) === normalizeUsername(user.username) || author === "Anonymous";
  };

  const hasUserLikedPost = (post) =>
    Array.isArray(post.likedBy) &&
    post.likedBy.some((value) => normalizeUsername(value) === normalizeUsername(user.username));

  const viewedUserPosts = viewingUser
    ? posts.filter((post) =>
        viewingUserAliases.some(
          (alias) => normalizeUsername(getPostAuthor(post)) === normalizeUsername(alias)
        )
      )
    : [];
  const ownPosts = user
    ? posts.filter((post) => normalizeUsername(getPostAuthor(post)) === normalizeUsername(user.username))
    : [];
  const homeFeedPosts = user
    ? posts.filter((post) => normalizeUsername(getPostAuthor(post)) !== normalizeUsername(user.username))
    : posts;

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getWeatherSummary = (code) => {
    const weatherByCode = {
      0: "Clear sky",
      1: "Mostly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Freezing fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Heavy drizzle",
      61: "Light rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Heavy showers",
      82: "Violent showers",
      95: "Thunderstorm",
    };

    return weatherByCode[code] || "Today's conditions";
  };

  const getWeatherIcon = (code) => {
    if (code === 0) return "Sun";
    if ([1, 2].includes(code)) return "Cloud sun";
    if ([3, 45, 48].includes(code)) return "Cloud";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
    if ([71, 73, 75].includes(code)) return "Snow";
    if (code === 95) return "Storm";
    return "Weather";
  };

  const sectionCard = {
    ...ui.card,
    padding: "28px",
  };

  const renderTextInput = (props) => (
    <input
      {...props}
      style={{ ...ui.input, ...(props.style || {}) }}
      onFocus={(e) => {
        e.target.style.borderColor = theme.inputFocus;
        if (props.onFocus) props.onFocus(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = theme.inputBorder;
        if (props.onBlur) props.onBlur(e);
      }}
    />
  );

  const openImagePreview = (src, label) => {
    if (!src) return;
    setPreviewImage({ src, label });
  };

  const renderBellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.75a4.5 4.5 0 0 0-4.5 4.5v1.06c0 .71-.2 1.41-.57 2.01l-1.02 1.63A2.25 2.25 0 0 0 7.82 16.5h8.36a2.25 2.25 0 0 0 1.91-3.55l-1.02-1.63a3.86 3.86 0 0 1-.57-2.01V8.25a4.5 4.5 0 0 0-4.5-4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 18a2.25 2.25 0 0 0 4.5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const renderUploadControl = ({ inputId, accept, onChange, file, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={onChange}
        style={{ display: "none" }}
      />
      <label
        htmlFor={inputId}
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "14px",
          border: `1px dashed ${theme.inputBorder}`,
          background: theme.subtleSurface,
          color: theme.accent,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "28px",
          fontWeight: "500",
          lineHeight: 1,
          boxSizing: "border-box",
        }}
        title={label}
      >
        +
      </label>
      <div style={{ color: theme.textMuted, fontSize: "14px" }}>
        {file?.name || label}
      </div>
    </div>
  );

  const renderPostMedia = (mediaUrl, altLabel = "post media") => {
    if (!mediaUrl) return null;

    return (
      <div style={{ marginBottom: "16px" }}>
        {isImage(mediaUrl) ? (
          <img
            src={mediaUrl}
            alt={altLabel}
            onClick={() => openImagePreview(mediaUrl, altLabel)}
            style={{ width: "100%", borderRadius: "18px", display: "block", cursor: "zoom-in" }}
          />
        ) : isVideo(mediaUrl) ? (
          <video controls style={{ width: "100%", borderRadius: "18px", display: "block" }}>
            <source src={mediaUrl} />
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt={altLabel}
            onClick={() => openImagePreview(mediaUrl, altLabel)}
            style={{ width: "100%", borderRadius: "18px", display: "block", cursor: "zoom-in" }}
          />
        )}
      </div>
    );
  };

  const renderSharedPost = (sharedPost) => {
    if (!sharedPost) return null;

    return (
      <div
        style={{
          marginBottom: "16px",
          padding: "18px",
          borderRadius: "20px",
          background: theme.subtleSurface,
          border: `1px solid ${theme.divider}`,
        }}
      >
        <div style={{ marginBottom: "10px", color: theme.textMuted, fontSize: "12px", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Shared Post
        </div>
        <div
          style={{ marginBottom: "4px", color: theme.accent, cursor: "pointer", fontWeight: "800", fontSize: "17px" }}
          onClick={() => viewUserProfile(getPostAuthor(sharedPost))}
        >
          {getPostAuthor(sharedPost)}
        </div>
        <div style={{ color: theme.textMuted, fontSize: "13px", marginBottom: "12px" }}>
          {formatTimestamp(sharedPost.timestamp)}
        </div>
        {sharedPost.content ? (
          <p style={{ margin: "0 0 14px", lineHeight: "1.7", color: theme.text }}>{sharedPost.content}</p>
        ) : (
          <div style={{ marginBottom: "14px", color: theme.textMuted }}>Original post had no text.</div>
        )}
        {renderPostMedia(sharedPost.mediaUrl, "shared post media")}
      </div>
    );
  };

  const renderPostCard = (post, idx) => (
    <div
      key={`${getPostAuthor(post)}-${post.content}-${idx}`}
      style={{ ...sectionCard, marginBottom: "20px", transition: "transform 0.18s ease, box-shadow 0.18s ease" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 30px 60px ${theme.glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme.cardShadow;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <div
            style={{ marginBottom: "4px", color: theme.accent, cursor: "pointer", fontWeight: "800", fontSize: "18px" }}
            onClick={() => viewUserProfile(getPostAuthor(post))}
          >
            {getPostAuthor(post)}
          </div>
          <div style={{ color: theme.textMuted, fontSize: "13px" }}>{formatTimestamp(post.timestamp)}</div>
        </div>
      </div>
      {post.content ? (
        <p style={{ margin: "0 0 16px", lineHeight: "1.7", color: theme.text }}>{post.content}</p>
      ) : post.sharedPost ? (
        <p style={{ margin: "0 0 16px", lineHeight: "1.7", color: theme.textMuted }}>
          {getPostAuthor(post)} shared a post.
        </p>
      ) : null}

      {renderSharedPost(post.sharedPost)}
      {renderPostMedia(post.mediaUrl)}

      <div
        style={{
          marginTop: "14px",
          paddingTop: "14px",
          borderTop: `1px solid ${theme.divider}`,
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => handleLike(getPostIdentifier(post))}
          disabled={hasUserLikedPost(post)}
          style={{
            ...ui.primaryButton,
            opacity: hasUserLikedPost(post) ? 0.7 : 1,
            cursor: hasUserLikedPost(post) ? "not-allowed" : "pointer",
          }}
        >
          Like {post.likes > 0 && `(${post.likes})`}
        </button>
        <button onClick={() => handleShare(post)} style={ui.secondaryButton}>
          Share
        </button>
        {canDeletePost(post) && (
          <button
            onClick={() => handleDeletePost(getPostIdentifier(post))}
            style={{
              ...ui.secondaryButton,
              background: theme.errorBg,
              color: theme.errorText,
              border: "none",
            }}
          >
            Delete
          </button>
        )}
      </div>

      {post.comments && post.comments.length > 0 && (
        <div style={{ marginTop: "18px", paddingLeft: "16px", borderLeft: `3px solid ${theme.accent}` }}>
          {post.comments.map((c, i) => (
            <div key={i} style={{ marginBottom: "12px", padding: "14px", background: theme.subtleSurface, borderRadius: "16px" }}>
              <div style={{ color: theme.text }}>
                <strong style={{ cursor: "pointer", color: theme.accent }} onClick={() => viewUserProfile(c.author)}>
                  {c.author}:
                </strong>{" "}
                {c.text}
              </div>
              <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => handleLikeComment(getPostIdentifier(post), i)} style={ui.secondaryButton}>
                  Like {c.likes > 0 && `(${c.likes})`}
                </button>
                <button
                  onClick={() => setReplyingTo(replyingTo === `${getPostIdentifier(post)}-${i}` ? null : `${getPostIdentifier(post)}-${i}`)}
                  style={ui.secondaryButton}
                >
                  Reply
                </button>
              </div>
              {replyingTo === `${getPostIdentifier(post)}-${i}` && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {renderTextInput({
                    type: "text",
                    placeholder: "Write a reply...",
                    value: replyText[`${getPostIdentifier(post)}-${i}`] || "",
                    onChange: (e) => setReplyText({ ...replyText, [`${getPostIdentifier(post)}-${i}`]: e.target.value }),
                    style: { flex: "1 1 220px" },
                  })}
                  <button onClick={() => handleReplyToComment(getPostIdentifier(post), i)} style={ui.primaryButton}>
                    Send
                  </button>
                </div>
              )}
              {c.replies && c.replies.length > 0 && (
                <div style={{ marginTop: "12px", marginLeft: "14px", paddingLeft: "12px", borderLeft: `2px solid ${theme.divider}` }}>
                  {c.replies.map((r, ri) => (
                    <div key={ri} style={{ marginBottom: "8px", padding: "10px 12px", borderRadius: "12px", background: theme.card }}>
                      <strong style={{ cursor: "pointer", color: theme.accent }} onClick={() => viewUserProfile(r.author)}>
                        {r.author}:
                      </strong>{" "}
                      <span style={{ color: theme.text }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {renderTextInput({
          type: "text",
          placeholder: "Add a comment...",
          value: commentText[getPostIdentifier(post)] || "",
          onChange: (e) => setCommentText({ ...commentText, [getPostIdentifier(post)]: e.target.value }),
          style: { flex: "1 1 240px" },
        })}
        <button onClick={() => handleComment(getPostIdentifier(post))} style={ui.primaryButton}>
          Comment
        </button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div style={ui.shell}>
        <div style={ui.orbOne} />
        <div style={ui.orbTwo} />
        <div style={{ ...ui.pageFrame, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ ...ui.card, width: "100%", maxWidth: "470px", padding: "36px" }}>
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <div style={{ ...ui.brandMark, margin: "0 auto 18px" }}>M</div>
              <div style={ui.pill}>{theme.name} mode follows your system clock</div>
              <h1 style={{ margin: "18px 0 8px", fontSize: "38px", lineHeight: "1.05" }}>MiniSocial</h1>
              <p style={{ margin: 0, color: theme.textMuted, fontSize: "16px" }}>
                A brighter social space by day, a calmer one after dark.
              </p>
            </div>

            {error && <div style={ui.alert}>{error}</div>}

            <form onSubmit={handleAuth}>
              <div style={{ display: "grid", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Email</label>
                  {renderTextInput({
                    type: "email",
                    value: email,
                    onChange: (e) => setEmail(e.target.value),
                    required: true,
                  })}
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Username</label>
                      {renderTextInput({
                        type: "text",
                        value: username,
                        onChange: (e) => setUsername(e.target.value),
                        required: true,
                      })}
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Sex</label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        required
                        style={{ ...ui.input, appearance: "none" }}
                      >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Date of Birth</label>
                      {renderTextInput({
                        type: "date",
                        value: dob,
                        onChange: (e) => setDob(e.target.value),
                        required: true,
                      })}
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Birthplace</label>
                      {renderTextInput({
                        type: "text",
                        value: birthplace,
                        onChange: (e) => setBirthplace(e.target.value),
                        placeholder: "City or town of birth",
                      })}
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Current City</label>
                      {renderTextInput({
                        type: "text",
                        value: currentCity,
                        onChange: (e) => setCurrentCity(e.target.value),
                        placeholder: "Where you live now",
                      })}
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Password</label>
                  {renderTextInput({
                    type: "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    required: true,
                    minLength: "6",
                  })}
                </div>

                <button type="submit" disabled={loading} style={{ ...ui.primaryButton, opacity: loading ? 0.72 : 1 }}>
                  {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
                </button>
              </div>
            </form>

            <p style={{ textAlign: "center", margin: "20px 0 0", color: theme.textMuted }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                style={ui.linkButton}
              >
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={ui.shell}>
      <div style={ui.orbOne} />
      <div style={ui.orbTwo} />
      <div style={ui.pageFrame}>
        <div style={ui.topBar}>
          <div
            style={{
              maxWidth: "1180px",
              margin: "0 auto",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "220px" }}>
              <div
                style={{ ...ui.brandMark, cursor: "pointer" }}
                onClick={() => {
                  setShowProfile(false);
                  setViewingUser(null);
                  setShowNotifications(false);
                }}
              >
                M
              </div>
              <div>
                <h1
                style={{ ...ui.title, cursor: "pointer" }}
                onClick={() => {
                  setShowProfile(false);
                  setViewingUser(null);
                  setShowNotifications(false);
                }}
              >
                  MiniSocial
                </h1>
                <div style={{ ...ui.pill, marginTop: "6px" }}>{theme.name} theme</div>
              </div>
            </div>

            <div style={{ flex: "1 1 320px", maxWidth: "420px", position: "relative" }}>
              {renderTextInput({
                type: "text",
                placeholder: "Search users...",
                value: searchQuery,
                onChange: (e) => handleSearch(e.target.value),
                onFocus: () => searchQuery && searchResults.length > 0 && setShowSearchResults(true),
                onBlur: () => setTimeout(() => setShowSearchResults(false), 200),
              })}
              {showSearchResults && searchResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    left: 0,
                    right: 0,
                    ...ui.card,
                    padding: "8px",
                    zIndex: 200,
                  }}
                >
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => selectSearchResult(result.username)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "14px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme.subtleSurface;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {result.profile_pic ? (
                        <img
                          src={result.profile_pic}
                          alt=""
                          style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.accent}` }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentAlt} 100%)`,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                          }}
                        >
                          {result.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: "700", color: theme.text }}>{result.username}</div>
                        <div style={{ fontSize: "12px", color: theme.textMuted }}>Open profile</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && !showSearchResults && searchResults.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    left: 0,
                    right: 0,
                    ...ui.card,
                    padding: "14px",
                    color: theme.textMuted,
                    zIndex: 200,
                  }}
                >
                  No users found
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowProfile(true);
                  setViewingUser(null);
                  setShowNotifications(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: theme.text,
                  fontWeight: "800",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: "8px 4px",
                }}
                title="Open profile"
              >
                {user.username}
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={async () => {
                    const nextValue = !showNotifications;
                    setShowNotifications(nextValue);
                    if (nextValue) {
                      await markNotificationsRead();
                    }
                  }}
                  style={ui.iconButton}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  {renderBellIcon()}
                  {unreadNotifications > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        display: "flex",
                        minWidth: "20px",
                        height: "20px",
                        borderRadius: "999px",
                        alignItems: "center",
                        justifyContent: "center",
                        background: theme.errorText,
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "800",
                        padding: "0 6px",
                      }}
                    >
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      width: "320px",
                      maxHeight: "420px",
                      overflowY: "auto",
                      ...ui.card,
                      padding: "10px",
                      zIndex: 300,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <strong>Notifications</strong>
                      <button onClick={() => setShowNotifications(false)} style={{ ...ui.linkButton, fontSize: "12px" }}>
                        Close
                      </button>
                    </div>
                    {notificationsLoading ? (
                      <div style={{ color: theme.textMuted, padding: "8px 4px" }}>Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div style={{ color: theme.textMuted, padding: "8px 4px" }}>No notifications yet.</div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setShowNotifications(false);
                            viewUserProfile(item.actorProfile || item.actor);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "12px",
                            marginBottom: "8px",
                            borderRadius: "14px",
                            border: "none",
                            cursor: "pointer",
                            background: item.read ? theme.subtleSurface : theme.badge,
                            color: theme.text,
                          }}
                        >
                          <div style={{ fontWeight: "700", marginBottom: "4px" }}>{item.message}</div>
                          <div style={{ fontSize: "12px", color: theme.textMuted }}>
                            {formatTimestamp(item.createdAt)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  ...ui.secondaryButton,
                  background: theme.errorBg,
                  color: theme.errorText,
                  border: "none",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div style={ui.container}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: viewingUser || showProfile ? "1fr" : "minmax(0, 720px) minmax(240px, 280px)",
              gap: "24px",
              alignItems: "start",
            }}
          >
            <div>
              {error && <div style={ui.alert}>{error}</div>}
              {flashNotice && (
                <div
                  style={{
                    ...ui.card,
                    marginBottom: "16px",
                    padding: "14px 18px",
                    background: flashNotice.tone === "success" ? theme.successBg : theme.errorBg,
                    color: flashNotice.tone === "success" ? theme.successText : theme.errorText,
                    border: "none",
                    position: "sticky",
                    top: "90px",
                    zIndex: 90,
                  }}
                >
                  {flashNotice.message}
                </div>
              )}

              {viewingUser ? (
                <>
                  <div style={{ ...sectionCard, marginBottom: "20px" }}>
                    <button onClick={() => setViewingUser(null)} style={{ ...ui.secondaryButton, marginBottom: "18px" }}>
                      Back to Feed
                    </button>
                    <h2 style={{ marginTop: 0 }}>{viewingUserProfile?.username}'s Profile</h2>
                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                      {viewingUserProfile?.profile_pic ? (
                        <img
                          src={viewingUserProfile.profile_pic}
                          alt="profile"
                          onClick={() =>
                            openImagePreview(
                              viewingUserProfile.profile_pic,
                              `${viewingUserProfile?.username || "User"} profile picture`
                            )
                          }
                          style={{
                            width: "124px",
                            height: "124px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: `3px solid ${theme.accent}`,
                            cursor: "zoom-in",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "124px",
                            height: "124px",
                            borderRadius: "50%",
                            margin: "0 auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: theme.badge,
                            border: `1px solid ${theme.cardBorder}`,
                            fontSize: "48px",
                            fontWeight: "800",
                          }}
                        >
                          {viewingUserProfile?.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ color: theme.textMuted, lineHeight: 1.9 }}>
                      <div><strong style={{ color: theme.text }}>Username:</strong> {viewingUserProfile?.username}</div>
                    <div><strong style={{ color: theme.text }}>Sex:</strong> {viewingUserProfile?.sex || "Not specified"}</div>
                    <div>
                      <strong style={{ color: theme.text }}>Date of Birth:</strong>{" "}
                      {viewingUserProfile?.dob ? new Date(viewingUserProfile.dob).toLocaleDateString() : "Not specified"}
                    </div>
                    <div><strong style={{ color: theme.text }}>Birthplace:</strong> {viewingUserProfile?.birthplace || "Not specified"}</div>
                    <div><strong style={{ color: theme.text }}>Current City:</strong> {viewingUserProfile?.current_city || "Not specified"}</div>
                  </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: "24px" }}>{viewingUser}'s Posts</h3>
                    <div style={{ ...ui.pill, color: theme.textMuted }}>
                      {viewedUserPosts.length} post{viewedUserPosts.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {viewedUserPosts.length === 0 ? (
                    <div style={{ ...sectionCard, color: theme.textMuted, textAlign: "center" }}>
                      No posts from {viewingUser} yet.
                    </div>
                  ) : (
                    viewedUserPosts.map((post, idx) => renderPostCard(post, idx))
                  )}
                </>
              ) : showProfile ? (
                <>
                  <div style={sectionCard}>
                    <h2 style={{ marginTop: 0 }}>My Profile</h2>
                    <form onSubmit={handleProfileUpdate}>
                      <div style={{ marginBottom: "18px", textAlign: "center" }}>
                        {profilePic ? (
                          <img
                            src={profilePic}
                            alt="profile"
                            onClick={() => openImagePreview(profilePic, "Your profile picture")}
                            style={{
                              width: "124px",
                              height: "124px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              marginBottom: "10px",
                              border: `3px solid ${theme.accent}`,
                              cursor: "zoom-in",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "124px",
                              height: "124px",
                              borderRadius: "50%",
                              margin: "0 auto 12px",
                              background: theme.badge,
                              border: `1px solid ${theme.cardBorder}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "48px",
                              fontWeight: "800",
                            }}
                          >
                            {username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {renderUploadControl({
                          inputId: "profile-pic-upload",
                          accept: "image/*",
                          onChange: (e) => setProfilePicFile(e.target.files[0]),
                          file: profilePicFile,
                          label: "Add profile photo",
                        })}
                      </div>

                      <div style={{ display: "grid", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Email</label>
                          <input type="email" value={user.email} disabled style={{ ...ui.input, opacity: 0.7 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Username</label>
                          {renderTextInput({
                            type: "text",
                            value: username,
                            onChange: (e) => setUsername(e.target.value),
                            required: true,
                          })}
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Sex</label>
                          <select value={sex} onChange={(e) => setSex(e.target.value)} required style={{ ...ui.input, appearance: "none" }}>
                            <option value="">Select...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Date of Birth</label>
                          {renderTextInput({
                            type: "date",
                            value: dob,
                            onChange: (e) => setDob(e.target.value),
                            required: true,
                          })}
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Birthplace</label>
                          {renderTextInput({
                            type: "text",
                            value: birthplace,
                            onChange: (e) => setBirthplace(e.target.value),
                            placeholder: "City or town of birth",
                          })}
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>Current City</label>
                          {renderTextInput({
                            type: "text",
                            value: currentCity,
                            onChange: (e) => setCurrentCity(e.target.value),
                            placeholder: "Where you live now",
                          })}
                        </div>
                        <button type="submit" disabled={loading} style={{ ...ui.primaryButton, opacity: loading ? 0.72 : 1 }}>
                          {loading ? "Updating..." : "Update Profile"}
                        </button>
                      </div>
                    </form>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 18px", gap: "12px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: "24px" }}>My Posts</h3>
                    <div style={{ ...ui.pill, color: theme.textMuted }}>
                      {ownPosts.length} post{ownPosts.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {ownPosts.length === 0 ? (
                    <div style={{ ...sectionCard, color: theme.textMuted, textAlign: "center" }}>
                      Your posts will appear here after you share them.
                    </div>
                  ) : (
                    ownPosts.map((post, idx) => renderPostCard(post, `own-${idx}`))
                  )}
                </>
              ) : (
                <>
                  <form onSubmit={createPost} style={{ ...sectionCard, marginBottom: "22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
                      <div>
                        <h2 style={{ margin: "0 0 6px" }}>Share something</h2>
                        <div style={{ color: theme.textMuted }}>The page theme follows your local time automatically.</div>
                      </div>
                      <div style={ui.pill}>{theme.mode === "day" ? "Sunny hours" : "Night shift"}</div>
                    </div>

                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What's on your mind?"
                      required
                      style={ui.textarea}
                      onFocus={(e) => {
                        e.target.style.borderColor = theme.inputFocus;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.inputBorder;
                      }}
                    />

                    <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                      <label style={{ display: "block", marginBottom: "8px", color: theme.textMuted, fontWeight: "700" }}>
                        Upload Image or Video
                      </label>
                      {renderUploadControl({
                        inputId: "post-media-upload",
                        accept: "image/*,video/*",
                        onChange: (e) => setMediaFile(e.target.files[0]),
                        file: mediaFile,
                        label: "Add media",
                      })}
                    </div>

                    <button type="submit" disabled={loading} style={{ ...ui.primaryButton, opacity: loading ? 0.72 : 1 }}>
                      {loading ? "Posting..." : "Post"}
                    </button>
                  </form>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "28px" }}>Feed</h2>
                    <div style={{ ...ui.pill, color: theme.textMuted }}>{homeFeedPosts.length} post{homeFeedPosts.length === 1 ? "" : "s"}</div>
                  </div>

                  {homeFeedPosts.length === 0 && (
                    <div style={{ ...sectionCard, textAlign: "center", color: theme.textMuted }}>
                      No posts from other users yet. Their new posts will appear here live.
                    </div>
                  )}

                  {homeFeedPosts.map((p, idx) => renderPostCard(p, `feed-${idx}`))}
                </>
              )}
            </div>

            {!viewingUser && !showProfile && (
              <aside style={{ display: "grid", gap: "18px" }}>
                <div style={{ ...sectionCard, position: "sticky", top: "98px" }}>
                  <div style={{ ...ui.pill, marginBottom: "14px" }}>Today's weather</div>
                  <h3 style={{ margin: "0 0 10px" }}>
                    {user?.currentCity || currentCity || "Set your current city"}
                  </h3>
                  {!user?.currentCity && !currentCity ? (
                    <p style={{ margin: 0, color: theme.textMuted, lineHeight: "1.7" }}>
                      Add your current city in your profile to show today's local weather on the feed homepage.
                    </p>
                  ) : weatherLoading ? (
                    <p style={{ margin: 0, color: theme.textMuted, lineHeight: "1.7" }}>
                      Loading weather for {user?.currentCity || currentCity}...
                    </p>
                  ) : weatherError ? (
                    <p style={{ margin: 0, color: theme.errorText, lineHeight: "1.7" }}>{weatherError}</p>
                  ) : weather ? (
                    <>
                      <div style={{ fontSize: "14px", color: theme.textMuted, marginBottom: "8px" }}>
                        {weather.city}, {weather.region}
                      </div>
                      <div style={{ fontSize: "28px", fontWeight: "800", marginBottom: "4px" }}>
                        {weather.temperature != null ? `${Math.round(weather.temperature)}°C` : "--"}
                      </div>
                      <div style={{ color: theme.textMuted, marginBottom: "14px" }}>
                        {getWeatherIcon(weather.weatherCode)} · {getWeatherSummary(weather.weatherCode)}
                      </div>
                      <div style={{ display: "grid", gap: "10px", color: theme.textMuted, fontSize: "14px" }}>
                        <div>High: <strong style={{ color: theme.text }}>{weather.maxTemp != null ? `${Math.round(weather.maxTemp)}°C` : "--"}</strong></div>
                        <div>Low: <strong style={{ color: theme.text }}>{weather.minTemp != null ? `${Math.round(weather.minTemp)}°C` : "--"}</strong></div>
                        <div>Wind: <strong style={{ color: theme.text }}>{weather.windSpeed != null ? `${Math.round(weather.windSpeed)} km/h` : "--"}</strong></div>
                      </div>
                    </>
                  ) : null}
                </div>
                <div style={sectionCard}>
                  <div style={{ ...ui.pill, marginBottom: "14px" }}>{theme.mode === "day" ? "Day palette" : "Night palette"}</div>
                  <h3 style={{ margin: "0 0 10px" }}>
                    {theme.mode === "day" ? "Warm daylight and clear cards" : "Cool low-light contrast and softer glare"}
                  </h3>
                  <p style={{ margin: 0, color: theme.textMuted, lineHeight: "1.7" }}>
                    The theme now follows the system time every minute, and the page frame stretches the design across the full screen so the sides no longer feel empty.
                  </p>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 10, 20, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(90vw, 720px)",
              width: "100%",
              ...ui.card,
              padding: "18px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px" }}>
              <strong>{previewImage.label}</strong>
              <button onClick={() => setPreviewImage(null)} style={ui.secondaryButton}>
                Close
              </button>
            </div>
            <img
              src={previewImage.src}
              alt={previewImage.label}
              style={{
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: "18px",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
