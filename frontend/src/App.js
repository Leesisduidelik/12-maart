import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import confetti from "canvas-confetti";
import axios from "axios";
import {
  BookOpen, Mic, Headphones, Edit3, Home, User, Award, 
  LogOut, Settings, Users, FileText, Upload, ChevronRight,
  Play, Pause, Check, X, Timer, Star, TrendingUp, Volume2,
  CreditCard, Menu, ArrowLeft, Eye, EyeOff, Building2, Copy, Phone, Mail,
  MessageSquare, Send, Bell, ChevronDown, ChevronUp, ClipboardCopy, Loader,
  Folder, FolderOpen, RefreshCw, Calendar, FileBarChart, DollarSign, Package
} from "lucide-react";
import "@/index.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (type, credentials) => {
    const endpoint = type === "admin" ? "/auth/admin/login" : "/auth/learner/login";
    const res = await axios.post(`${API}${endpoint}`, credentials);
    localStorage.setItem("token", res.data.access_token);
    const userRes = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${res.data.access_token}` }
    });
    setUser(userRes.data);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/learner/register`, data);
    localStorage.setItem("token", res.data.access_token);
    const userRes = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${res.data.access_token}` }
    });
    setUser(userRes.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return { user, loading, login, register, logout, setUser };
};

// API Helper
const api = axios.create({ baseURL: API });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Components
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const Card = ({ children, className = "", onClick, testId }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: "0 8px 30px -12px rgba(0,0,0,0.15)" }}
    className={`card ${className}`}
    onClick={onClick}
    data-testid={testId}
  >
    {children}
  </motion.div>
);

const Button = ({ children, variant = "primary", className = "", disabled, onClick, testId, type = "button" }) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    disabled={disabled}
    onClick={onClick}
    data-testid={testId}
    type={type}
  >
    {children}
  </motion.button>
);

const Input = ({ label, error, testId, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-text-secondary mb-2">{label}</label>}
    <input className={`input-field ${error ? "border-accent-500" : ""}`} data-testid={testId} {...props} />
    {error && <p className="text-accent-500 text-sm mt-1">{error}</p>}
  </div>
);

// Password Input with visibility toggle
const PasswordInput = ({ label, error, testId, value, onChange, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-semibold text-text-secondary mb-2">{label}</label>}
      <div className="relative">
        <input 
          type={showPassword ? "text" : "password"}
          className={`input-field pr-12 ${error ? "border-accent-500" : ""}`} 
          data-testid={testId}
          value={value}
          onChange={onChange}
          {...props} 
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
          data-testid={`${testId}-toggle`}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-accent-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

const ProgressBar = ({ value, max = 100, label }) => (
  <div className="mb-4">
    {label && <div className="flex justify-between mb-2">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <span className="text-sm font-bold text-primary-500">{Math.round((value/max)*100)}%</span>
    </div>}
    <div className="progress-bar">
      <motion.div 
        className="progress-bar-fill" 
        initial={{ width: 0 }}
        animate={{ width: `${(value/max)*100}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  </div>
);

// Landing Page
const LandingPage = () => {
  const navigate = useNavigate();
  
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 opacity-50" />
          <div className="max-w-6xl mx-auto px-4 py-16 relative">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-heading text-4xl md:text-6xl font-bold text-text-primary mb-6">
                Lees is <span className="text-primary-500">Duidelik</span>
              </h1>
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
                Help jou kind om beter te lees met interaktiewe oefeninge in Afrikaans. 
                Van begripstoetse tot hardoplees – ons maak lees pret!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate("/register")} testId="register-btn">
                  Begin Nou – Gratis Proeftydperk
                </Button>
                <Button variant="secondary" onClick={() => navigate("/login")} testId="login-btn">
                  Meld Aan
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              className="mt-12 relative"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Cartoon illustration hero */}
              <div className="bg-gradient-to-br from-primary-100 via-secondary-100 to-accent-100 rounded-3xl shadow-2xl mx-auto max-w-3xl w-full p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="text-8xl md:text-9xl mb-4">📚</div>
                    <p className="text-xl font-heading font-bold text-primary-600">Lees</p>
                  </div>
                  <div className="text-center">
                    <div className="text-8xl md:text-9xl mb-4">🎧</div>
                    <p className="text-xl font-heading font-bold text-secondary-600">Luister</p>
                  </div>
                  <div className="text-center">
                    <div className="text-8xl md:text-9xl mb-4">✍️</div>
                    <p className="text-xl font-heading font-bold text-accent-600">Skryf</p>
                  </div>
                  <div className="text-center">
                    <div className="text-8xl md:text-9xl mb-4">⭐</div>
                    <p className="text-xl font-heading font-bold text-purple-600">Groei</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            Hoe Werk Dit?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: "Begripstoetse", desc: "Lees stories en beantwoord vrae om begrip te verbeter" },
              { icon: Mic, title: "Hardoplees", desc: "Neem jouself op en kry terugvoer oor jou leesspoed" },
              { icon: Headphones, title: "Luistertoetse", desc: "Luister na tekste en verbeter jou gehoor" },
              { icon: Edit3, title: "Speltoetse", desc: "Oefen spelling met ouderdomsgepaste woorde" }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="text-center h-full">
                  <feature.icon className="w-12 h-12 text-primary-500 mx-auto mb-4" strokeWidth={2} />
                  <h3 className="font-heading text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-text-secondary">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
              Pryse
            </h2>
            <p className="text-text-secondary text-center mb-12">7 dae gratis proeftydperk ingesluit!</p>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-primary-500">
                <div className="text-center">
                  <h3 className="font-heading text-2xl font-bold mb-2">Maandeliks</h3>
                  <div className="text-4xl font-bold text-primary-500 mb-4">R100<span className="text-lg text-text-muted">/maand</span></div>
                  <ul className="text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Alle oefeninge</li>
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Vordering-opsporing</li>
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Kanselleer enige tyd</li>
                  </ul>
                  <Button onClick={() => navigate("/register")} className="w-full" testId="monthly-plan-btn">
                    Kies Maandeliks
                  </Button>
                </div>
              </Card>
              <Card className="border-2 border-secondary-500 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-secondary-500 text-text-primary text-xs font-bold px-3 py-1 rounded-full">
                  SPAAR 66%
                </div>
                <div className="text-center">
                  <h3 className="font-heading text-2xl font-bold mb-2">Eenmalig</h3>
                  <div className="text-4xl font-bold text-secondary-500 mb-4">R399<span className="text-lg text-text-muted"> totaal</span></div>
                  <ul className="text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Alle oefeninge</li>
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Vordering-opsporing</li>
                    <li className="flex items-center gap-2"><Check className="w-5 h-5 text-primary-500" /> Lewenslange toegang</li>
                  </ul>
                  <Button onClick={() => navigate("/register")} className="w-full bg-secondary-500" testId="once-off-plan-btn">
                    Kies Eenmalig
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-text-primary text-white py-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="font-heading text-xl mb-2">Lees is Duidelik</p>
            <p className="text-slate-400">Gebou met liefde vir Suid-Afrikaanse leerders</p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};

// Auth Pages
const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState("learner"); // "learner", "parent", "admin"
  const [form, setForm] = useState({ username: "", password: "", email: "", whatsapp: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showParentRegister, setShowParentRegister] = useState(false);
  const [parentForm, setParentForm] = useState({ name: "", email: "", whatsapp: "", password: "" });
  const [parentLoginMethod, setParentLoginMethod] = useState("whatsapp"); // "whatsapp" or "email"

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (loginType === "admin") {
        await onLogin("admin", { email: form.email, password: form.password });
        navigate("/admin");
      } else if (loginType === "parent") {
        const loginData = parentLoginMethod === "email" 
          ? { email: form.email, password: form.password }
          : { whatsapp: form.whatsapp, password: form.password };
        const res = await api.post("/parent/login", loginData);
        localStorage.setItem("token", res.data.access_token);
        navigate("/parent-dashboard");
      } else {
        await onLogin("learner", { username: form.username, password: form.password });
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Aanmelding het misluk");
    }
    setLoading(false);
  };

  const handleParentRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/parent/register", parentForm);
      localStorage.setItem("token", res.data.access_token);
      toast.success("Registrasie suksesvol!");
      navigate("/parent-dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registrasie het misluk");
    }
    setLoading(false);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-primary">
            <ArrowLeft className="w-4 h-4" /> Terug
          </button>
          <h1 className="font-heading text-3xl font-bold text-center mb-6">
            {loginType === "admin" ? "Admin Aanmelding" : loginType === "parent" ? "Ouer Aanmelding" : "Leerder Aanmelding"}
          </h1>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setLoginType("learner"); setShowParentRegister(false); }}
              className={`flex-1 py-2 rounded-full font-semibold transition-colors ${loginType === "learner" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"}`}
              data-testid="learner-tab"
            >
              Leerder
            </button>
            <button
              onClick={() => { setLoginType("parent"); setShowParentRegister(false); }}
              className={`flex-1 py-2 rounded-full font-semibold transition-colors ${loginType === "parent" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"}`}
              data-testid="parent-tab"
            >
              Ouer
            </button>
            <button
              onClick={() => { setLoginType("admin"); setShowParentRegister(false); }}
              className={`flex-1 py-2 rounded-full font-semibold transition-colors ${loginType === "admin" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"}`}
              data-testid="admin-tab"
            >
              Admin
            </button>
          </div>

          {loginType === "parent" && showParentRegister ? (
            <form onSubmit={handleParentRegister}>
              <Input
                label="Volle Naam"
                value={parentForm.name}
                onChange={(e) => setParentForm({...parentForm, name: e.target.value})}
                required
                testId="parent-name-input"
              />
              <Input
                label="WhatsApp / Sel Nommer"
                value={parentForm.whatsapp}
                onChange={(e) => setParentForm({...parentForm, whatsapp: e.target.value})}
                placeholder="bv. 0821234567"
                required
                testId="parent-whatsapp-input"
              />
              <Input
                label="E-pos (Opsioneel)"
                type="email"
                value={parentForm.email}
                onChange={(e) => setParentForm({...parentForm, email: e.target.value})}
                testId="parent-email-reg-input"
              />
              <PasswordInput
                label="Wagwoord"
                value={parentForm.password}
                onChange={(e) => setParentForm({...parentForm, password: e.target.value})}
                required
                testId="parent-password-input"
              />
              
              {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
              
              <Button type="submit" disabled={loading} className="w-full" testId="parent-register-submit">
                {loading ? "Besig..." : "Registreer"}
              </Button>
              
              <p className="text-center mt-4 text-text-secondary">
                Reeds geregistreer?{" "}
                <button type="button" onClick={() => setShowParentRegister(false)} className="text-primary-500 font-semibold">
                  Meld aan
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              {loginType === "admin" ? (
                <Input
                  label="E-pos"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  required
                  testId="email-input"
                />
              ) : loginType === "parent" ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setParentLoginMethod("whatsapp")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${parentLoginMethod === "whatsapp" ? "bg-primary-100 text-primary-700 border-2 border-primary-500" : "bg-slate-100 text-text-secondary"}`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentLoginMethod("email")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${parentLoginMethod === "email" ? "bg-primary-100 text-primary-700 border-2 border-primary-500" : "bg-slate-100 text-text-secondary"}`}
                    >
                      E-pos
                    </button>
                  </div>
                  {parentLoginMethod === "email" ? (
                    <Input
                      label="E-pos"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({...form, email: e.target.value})}
                      required
                      testId="email-input"
                    />
                  ) : (
                    <Input
                      label="WhatsApp Nommer"
                      value={form.whatsapp}
                      onChange={(e) => setForm({...form, whatsapp: e.target.value})}
                      placeholder="bv. 0821234567"
                      required
                      testId="whatsapp-input"
                    />
                  )}
                </>
              ) : (
                <Input
                  label="Gebruikersnaam"
                  value={form.username}
                  onChange={(e) => setForm({...form, username: e.target.value})}
                  required
                  testId="username-input"
                />
              )}
              <PasswordInput
                label="Wagwoord"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                required
                testId="password-input"
              />
              
              {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
              
              <Button type="submit" disabled={loading} className="w-full" testId="login-submit">
                {loading ? "Besig..." : "Meld Aan"}
              </Button>
            </form>
          )}

          {loginType === "learner" && (
            <p className="text-center mt-4 text-text-secondary">
              Nog nie geregistreer nie?{" "}
              <button onClick={() => navigate("/register")} className="text-primary-500 font-semibold" data-testid="go-to-register">
                Registreer hier
              </button>
            </p>
          )}
          
          {loginType === "parent" && !showParentRegister && (
            <p className="text-center mt-4 text-text-secondary">
              Nog nie geregistreer nie?{" "}
              <button type="button" onClick={() => setShowParentRegister(true)} className="text-primary-500 font-semibold" data-testid="go-to-parent-register">
                Registreer hier
              </button>
            </p>
          )}
        </Card>
      </div>
    </PageTransition>
  );
};

const RegisterPage = ({ onRegister }) => {
  const navigate = useNavigate();
  const [registrationType, setRegistrationType] = useState("learner"); // "learner" or "school"
  const [form, setForm] = useState({
    name: "", surname: "", grade: 1, username: "", password: "", whatsapp: "", parent_permission: false, invitation_code: "",
    parent_email: "", parent_whatsapp: ""
  });
  const [schoolForm, setSchoolForm] = useState({
    school_name: "",
    contact_person: "",
    contact_email: "",
    contact_whatsapp: "",
    contact_phone: "",
    principal_contact: "",
    school_email: "",
    learner_count: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolSubmitted, setSchoolSubmitted] = useState(false);

  // Check for invitation code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      setForm(prev => ({...prev, invitation_code: code}));
    }
  }, []);

  const handleLearnerSubmit = async (e) => {
    e.preventDefault();
    if (!form.parent_permission) {
      setError("Ouer toestemming is nodig");
      return;
    }
    if (!form.invitation_code) {
      setError("Uitnodigingskode is nodig");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onRegister({ ...form, grade: parseInt(form.grade) });
      toast.success("Registrasie suksesvol!");
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/reading-test", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Registrasie het misluk");
    }
    setLoading(false);
  };

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API}/schools/register`, schoolForm);
      setSchoolSubmitted(true);
      toast.success("Skool registrasie ontvang! Ons sal jou kontak.");
    } catch (err) {
      setError(err.response?.data?.detail || "Registrasie het misluk");
    }
    setLoading(false);
  };

  if (schoolSubmitted) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold mb-4">Dankie!</h1>
            <p className="text-text-secondary mb-6">
              Ons het jou skool se registrasie ontvang. Ons sal binnekort kontak maak om 'n skoolkode te skep vir jou leerders.
            </p>
            <Button onClick={() => navigate("/")} className="w-full" testId="back-home-btn">
              Terug na Tuisblad
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-md">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-text-muted mb-6 hover:text-text-primary">
            <ArrowLeft className="w-4 h-4" /> Terug
          </button>
          <h1 className="font-heading text-3xl font-bold text-center mb-2">Registreer</h1>
          <p className="text-center text-text-secondary mb-6">7 dae gratis proeftydperk!</p>
          
          {/* Registration Type Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRegistrationType("learner")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2 ${registrationType === "learner" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"}`}
              data-testid="learner-reg-tab"
            >
              <User className="w-4 h-4" /> Leerder
            </button>
            <button
              onClick={() => setRegistrationType("school")}
              className={`flex-1 py-3 rounded-full font-semibold transition-colors flex items-center justify-center gap-2 ${registrationType === "school" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary"}`}
              data-testid="school-reg-tab"
            >
              <Building2 className="w-4 h-4" /> Skool
            </button>
          </div>

          {registrationType === "learner" ? (
            <form onSubmit={handleLearnerSubmit}>
              <Input
                label="Uitnodigingskode"
                value={form.invitation_code}
                onChange={(e) => setForm({...form, invitation_code: e.target.value.toUpperCase()})}
                placeholder="bv. ABC12345"
                required
                testId="invitation-code-input"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Naam"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  required
                  testId="name-input"
                />
                <Input
                  label="Van"
                  value={form.surname}
                  onChange={(e) => setForm({...form, surname: e.target.value})}
                  required
                  testId="surname-input"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-text-secondary mb-2">Graad</label>
                <select
                  className="input-field"
                  value={form.grade}
                  onChange={(e) => setForm({...form, grade: e.target.value})}
                  data-testid="grade-select"
                >
                  {[1,2,3,4,5,6,7,8,9].map(g => (
                    <option key={g} value={g}>Graad {g}</option>
                  ))}
                </select>
              </div>
              
              <Input
                label="Gebruikersnaam"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                required
                testId="reg-username-input"
              />
              <PasswordInput
                label="Wagwoord"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                required
                testId="reg-password-input"
              />
              
              <Input
                label="Jou WhatsApp / Sel Nommer"
                value={form.whatsapp}
                onChange={(e) => setForm({...form, whatsapp: e.target.value})}
                placeholder="bv. 0821234567"
                required
                testId="learner-whatsapp-input"
              />
              
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-text-secondary mb-3">
                  <strong>Ouer/Voog Besonderhede (Opsioneel)</strong><br/>
                  Voeg jou ouer se besonderhede by sodat hulle toegang kry tot die ouerportaal.
                </p>
                <Input
                  label="Ouer E-pos"
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm({...form, parent_email: e.target.value})}
                  placeholder="bv. ouer@email.com"
                  testId="parent-email-input"
                />
                <Input
                  label="Ouer WhatsApp Nommer"
                  value={form.parent_whatsapp}
                  onChange={(e) => setForm({...form, parent_whatsapp: e.target.value})}
                  placeholder="bv. 0821234567"
                  testId="parent-whatsapp-input"
                />
              </div>
              
              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.parent_permission}
                  onChange={(e) => setForm({...form, parent_permission: e.target.checked})}
                  className="mt-1 w-5 h-5 rounded border-slate-300"
                  data-testid="parent-permission-checkbox"
                />
                <span className="text-sm text-text-secondary">
                  Ek bevestig dat ek ouer/voog toestemming het om hierdie kind te registreer.
                </span>
              </label>
              
              {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
              
              <Button type="submit" disabled={loading} className="w-full" testId="register-submit">
                {loading ? "Besig..." : "Registreer"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSchoolSubmit}>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-text-secondary">
                  <strong>Vir skole:</strong> Registreer jou skool en ons sal 'n spesiale skoolkode skep wat al jou leerders kan gebruik om te registreer.
                </p>
              </div>
              
              <Input
                label="Skool Naam"
                value={schoolForm.school_name}
                onChange={(e) => setSchoolForm({...schoolForm, school_name: e.target.value})}
                placeholder="bv. Laerskool Pretoria-Oos"
                required
                testId="school-name-input"
              />
              
              <Input
                label="Kontakpersoon (Naam)"
                value={schoolForm.contact_person}
                onChange={(e) => setSchoolForm({...schoolForm, contact_person: e.target.value})}
                required
                testId="contact-person-input"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Kontakpersoon E-pos"
                  type="email"
                  value={schoolForm.contact_email}
                  onChange={(e) => setSchoolForm({...schoolForm, contact_email: e.target.value})}
                  required
                  testId="contact-email-input"
                />
                <Input
                  label="WhatsApp Nommer"
                  value={schoolForm.contact_whatsapp}
                  onChange={(e) => setSchoolForm({...schoolForm, contact_whatsapp: e.target.value})}
                  placeholder="bv. 0821234567"
                  required
                  testId="contact-whatsapp-input"
                />
              </div>
              
              <Input
                label="Telefoonnommer"
                value={schoolForm.contact_phone}
                onChange={(e) => setSchoolForm({...schoolForm, contact_phone: e.target.value})}
                placeholder="bv. 0121234567"
                testId="contact-phone-input"
              />
              
              <Input
                label="Skool E-pos"
                type="email"
                value={schoolForm.school_email}
                onChange={(e) => setSchoolForm({...schoolForm, school_email: e.target.value})}
                placeholder="bv. admin@skool.co.za"
                testId="school-email-input"
              />
              
              <Input
                label="Skoolhoof Kontakbesonderhede"
                value={schoolForm.principal_contact}
                onChange={(e) => setSchoolForm({...schoolForm, principal_contact: e.target.value})}
                placeholder="Naam en telefoonnommer"
                testId="principal-contact-input"
              />
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-text-secondary mb-2">Geskatte Aantal Leerders</label>
                <select
                  className="input-field"
                  value={schoolForm.learner_count}
                  onChange={(e) => setSchoolForm({...schoolForm, learner_count: parseInt(e.target.value)})}
                  data-testid="learner-count-select"
                >
                  <option value={10}>10 - 50 leerders</option>
                  <option value={50}>50 - 100 leerders</option>
                  <option value={100}>100 - 200 leerders</option>
                  <option value={200}>200 - 500 leerders</option>
                  <option value={500}>500+ leerders</option>
                </select>
              </div>
              
              {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
              
              <Button type="submit" disabled={loading} className="w-full" testId="school-register-submit">
                {loading ? "Besig..." : "Dien Skool Registrasie In"}
              </Button>
            </form>
          )}

          <p className="text-center mt-4 text-text-secondary">
            Reeds geregistreer?{" "}
            <button onClick={() => navigate("/login")} className="text-primary-500 font-semibold" data-testid="go-to-login">
              Meld aan
            </button>
          </p>
        </Card>
      </div>
    </PageTransition>
  );
};

// Reading Level Test
const ReadingTestPage = ({ user }) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState("intro"); // intro, reading, result
  const [startTime, setStartTime] = useState(null);
  const [result, setResult] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [errors, setErrors] = useState(0);
  
  // Grade-appropriate reading tests
  const gradeTexts = {
    1: `Die kat sit. Die hond hardloop. Ma gee kos. Pa lees. Ek speel bal. Die son skyn. Dit is warm. Ek is bly. Ons is tuis. Dit is lekker.`,
    2: `Die kat sit op die mat. Die hond hardloop in die tuin. Ma gee vir ons kos. Pa lees die koerant. Ek speel bal met my vriende. Die son skyn helder vandag. Dit is baie warm buite. Ek is gelukkig.`,
    3: `Die son skyn helder oor die plaas. Boer Jan stap na die skuur. Sy hond Brak loop saam. Hulle gaan die koeie melk. Die koeie staan en wag. Brak blaf hard. Die koeie skrik. Boer Jan lag. Dit is 'n goeie dag op die plaas.`,
    4: `Die son skyn helder oor die plaas. Boer Jan stap na die groot rooi skuur. Sy getroue hond Brak loop opgewonde saam met hom. Hulle gaan die koeie melk soos elke oggend. Die koeie staan geduldig en wag by die hek. Brak blaf hard toe hy 'n haas sien. Die koeie skrik eers, maar kalmeer gou. Boer Jan lag vriendelik vir sy hond. Dit is 'n wonderlike dag op die plaas. Die voëls sing in die bome.`,
    5: `Die son skyn helder oor die uitgestrekte plaas. Boer Jan stap met stewige treë na die groot rooi skuur. Sy getroue hond Brak loop opgewonde saam, sy stert waai heen en weer. Hulle gaan die koeie melk soos hulle elke oggend doen. Die koeie staan geduldig en wag by die ou houthek. Brak blaf hard toe hy 'n vinnige haas tussen die bosse sien. Die koeie skrik eers vir die geraas, maar hulle kalmeer gou weer. Boer Jan lag vriendelik vir sy energieke hond. Dit is 'n wonderlike dag op die plaas. Die voëls sing vrolik in die bome en die lug is vars en skoon.`,
    6: `Die oggendson skyn helder oor die uitgestrekte plaas in die Vrystaat. Boer Jan stap met stewige, selfversekerde treë na die groot rooi skuur wat sy oupa jare gelede gebou het. Sy getroue hond Brak loop opgewonde langs hom, sy stert waai heen en weer van blydskap. Hulle gaan die koeie melk soos hulle elke oggend stiptelik doen. Die bruin-en-wit koeie staan geduldig en wag by die ou verweerde houthek. Skielik blaf Brak hard toe hy 'n vinnige haas tussen die digte bosse gewaar. Die koeie skrik eers vir die onverwagse geraas, maar hulle kalmeer gou weer toe hulle besef daar is geen gevaar nie. Boer Jan lag hartlik en vriendelik vir sy energieke, jong hond. Dit is waarlik 'n wonderlike dag op die plaas. Die voëls sing vrolik in die bome en die oggendlug is vars, skoon en verkwikkend.`,
    7: `Die vroeë oggendson skyn helder oor die uitgestrekte, vrugbare plaas in die hartjie van die Vrystaat. Boer Jan, 'n man van middeljare met 'n verweerde gesig wat getuig van jare se harde werk, stap met stewige, selfversekerde treë na die groot rooi skuur wat sy oupa meer as vyftig jaar gelede met sy eie hande gebou het. Sy getroue Boerboel-hond Brak loop opgewonde langs hom, sy stert waai onophoudelik heen en weer van pure blydskap oor die nuwe dag. Hulle gaan die koeie melk soos hulle elke oggend sonder uitsondering stiptelik doen. Die pragtige bruin-en-wit Jerseykoie staan geduldig en wag by die ou, verweerde houthek wat dringend geverf moet word. Skielik blaf Brak hard en dreigend toe hy 'n vinnige haas tussen die digte bosse langs die pad gewaar. Die koeie skrik eers vir die onverwagse, skerp geraas, maar hulle kalmeer gou weer toe hulle besef daar is geen werklike gevaar nie.`,
    8: `Die vroeë oggendson skyn helder oor die uitgestrekte, vrugbare plaas wat al vir drie geslagte in die Van der Merwe-familie is, geleë in die hartjie van die Vrystaat. Boer Jan, 'n geharde man van middeljare met 'n diep verweerde gesig wat getuig van dekades se harde werk onder die genadelose Suid-Afrikaanse son, stap met stewige, selfversekerde treë na die groot rooi skuur. Hierdie historiese gebou het sy oupa meer as vyftig jaar gelede met sy eie vaardige hande en onwrikbare deursettingsvermoë gebou. Sy getroue Boerboel-hond Brak, 'n massiewe dier met 'n goue pels en intelligente oë, loop opgewonde langs hom. Die hond se stert waai onophoudelik heen en weer van pure, onbedwingbare blydskap oor die aanbreek van nog 'n nuwe dag vol avontuur en werk. Hulle gaan die koeie melk soos hulle elke oggend sonder uitsondering of versuim stiptelik doen, want dissipline en roetine is die ruggraat van 'n suksesvolle plaas. Die pragtige bruin-en-wit Jerseykoie, elkeen met haar eie unieke persoonlikheid en naam, staan geduldig en wag by die ou, verweerde houthek wat dringend geverf moet word wanneer die winter verby is. Skielik blaf Brak hard en dreigend toe hy 'n vinnige veldhaas tussen die digte doringbosse langs die grondpad gewaar. Die koeie skrik aanvanklik vir die onverwagse, skerp geraas wat die stilte van die oggend verbreek, maar hulle kalmeer merkwaardig gou weer toe hulle instinktief besef daar is geen werklike gevaar of bedreiging vir hulle veiligheid nie. Boer Jan lag hartlik, 'n diep, warm geluid wat oor die velde eggo.`,
    9: `Die vroeë oggendson skyn helder en goue strale oor die uitgestrekte, vrugbare plaas wat al vir drie opeenvolgende geslagte in die hardwerkende Van der Merwe-familie is, strategies geleë in die pittoreske hartjie van die Vrystaat se mielieland. Boer Jan, 'n geharde en wyse man van middeljare met 'n diep verweerde gesig wat onmiskenbaar getuig van dekades se harde, eerbare werk onder die genadelose Suid-Afrikaanse son, stap met stewige, selfversekerde treë oor die bedoude gras na die groot, kenmerkende rooi skuur. Hierdie historiese en geliefde gebou het sy legendariese oupa meer as vyftig jaar gelede met sy eie vaardige, eelterige hande en 'n onwrikbare deursettingsvermoë wat vandag skaars is, opgerig uit plaaslike klip en hout. Sy getroue Boerboel-hond Brak, 'n massiewe, indrukwekkende dier met 'n blink goue pels en merkwaardig intelligente, waaksame oë, loop opgewonde en beskermend langs sy geliefde baas. Die troue hond se dik stert waai onophoudelik en ritmies heen en weer van pure, onbedwingbare blydskap oor die aanbreek van nog 'n belowende nuwe dag vol avontuur, uitdagings en betekenisvolle werk. Hulle gaan die koeie melk soos hulle elke oggend sonder uitsondering, versuim of klagte stiptelik en getrou doen, want dissipline, konsekwentheid en vaste roetine is ongetwyfeld die onontbeerlike ruggraat van enige suksesvolle, volhoubare plaasonderneming. Die pragtige, gesonde bruin-en-wit Jerseykoie, elkeen met haar eie unieke persoonlikheid, eienaardighede en toepasslike naam wat deur die kinders gekies is, staan geduldig, kalm en wag by die ou, verweerde houthek wat dringend geverf en herstel moet word sodra die koue wintermaande finaal verby is en die lente sy verskyning maak.`
  };
  
  const learnerGrade = user?.grade || 3;
  const testText = gradeTexts[learnerGrade] || gradeTexts[3];
  const wordCountTotal = testText.split(/\s+/).length;

  const startTest = () => {
    setStage("reading");
    setStartTime(Date.now());
  };

  const finishTest = async () => {
    const endTime = Date.now();
    const timeSeconds = (endTime - startTime) / 1000;
    const wordsRead = wordCount || wordCountTotal;
    
    try {
      const res = await api.post("/reading-test/submit", {
        words_read: wordsRead,
        time_seconds: timeSeconds,
        errors: errors
      });
      setResult(res.data);
      setStage("result");
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      toast.error("Kon nie resultaat stoor nie");
    }
  };

  if (stage === "intro") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl text-center">
            <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
            <h1 className="font-heading text-3xl font-bold mb-4">Leesvlaktoets</h1>
            <p className="text-text-secondary mb-2">
              Graad {learnerGrade} - {wordCountTotal} woorde
            </p>
            <p className="text-text-secondary mb-6">
              Lees die volgende teks so vinnig en akkuraat as moontlik. 
              Ons sal jou leesvlak bepaal op grond van jou spoed.
            </p>
            <Button onClick={startTest} testId="start-test-btn">
              Begin Toets
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (stage === "reading") {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">Lees Hardop</h2>
              <div className="flex items-center gap-2 text-accent-500">
                <Timer className="w-5 h-5" />
                <span className="font-mono">Tydsberekening...</span>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
              <p className="text-lg leading-relaxed">{testText}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-text-secondary mb-2">
                Hoeveel woorde het jy gelees? (opsioneel)
              </label>
              <input
                type="number"
                className="input-field"
                placeholder={wordCountTotal}
                value={wordCount || ""}
                onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                data-testid="word-count-input"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-text-secondary mb-2">
                Hoeveel foute het jy gemaak?
              </label>
              <input
                type="number"
                className="input-field"
                value={errors}
                onChange={(e) => setErrors(parseInt(e.target.value) || 0)}
                min="0"
                data-testid="errors-input"
              />
            </div>
            
            <Button onClick={finishTest} className="w-full" testId="finish-test-btn">
              Klaar Gelees
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Star className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-4">Uitstekend!</h1>
          <p className="text-text-secondary mb-6">{result?.message}</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-bold text-primary-500 mb-2">{result?.wpm}</div>
            <div className="text-text-secondary">woorde per minuut</div>
          </div>
          
          <Button onClick={() => navigate("/dashboard")} className="w-full" testId="go-to-dashboard">
            Gaan na Dashboard
          </Button>
        </Card>
      </div>
    </PageTransition>
  );
};

// Parent Dashboard
const ParentDashboard = () => {
  const navigate = useNavigate();
  const [parent, setParent] = useState(null);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [learnerProgress, setLearnerProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkForm, setLinkForm] = useState({ name: "", surname: "" });
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    api.get("/parent/me")
      .then(res => {
        setParent(res.data);
        if (res.data.learners?.length > 0) {
          setSelectedLearner(res.data.learners[0]);
        }
      })
      .catch(err => {
        if (err.response?.status === 401) {
          navigate("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (selectedLearner) {
      api.get(`/parent/learner-progress/${selectedLearner.id}`)
        .then(res => setLearnerProgress(res.data))
        .catch(console.error);
    }
  }, [selectedLearner]);

  // Generate weekly progress text for manual sharing
  const [progressText, setProgressText] = useState("");
  const [generatingText, setGeneratingText] = useState(false);
  const [showProgressText, setShowProgressText] = useState(false);

  const generateProgressText = async () => {
    setGeneratingText(true);
    try {
      const res = await api.get("/parent/weekly-progress-text");
      setProgressText(res.data.text);
      setShowProgressText(true);
      toast.success("Opsomming gegenereer!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie genereer nie");
    }
    setGeneratingText(false);
  };

  const copyProgressText = () => {
    navigator.clipboard.writeText(progressText);
    toast.success("Gekopieer! Plak dit nou in WhatsApp of SMS");
  };

  const handleLinkLearner = async () => {
    if (!linkForm.name.trim() || !linkForm.surname.trim()) {
      toast.error("Voer die leerder se naam en van in");
      return;
    }
    setLinking(true);
    try {
      const res = await api.post("/parent/link-learner", { 
        learner_name: linkForm.name.trim(), 
        learner_surname: linkForm.surname.trim() 
      });
      toast.success(res.data.message);
      if (res.data.email_sent) {
        toast.success("Bevestigings-e-pos gestuur!");
      }
      // Refresh parent data
      const parentRes = await api.get("/parent/me");
      setParent(parentRes.data);
      if (!selectedLearner && parentRes.data.learners?.length > 0) {
        setSelectedLearner(parentRes.data.learners[0]);
      }
      setLinkForm({ name: "", surname: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie koppel nie");
    }
    setLinking(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <nav className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="font-heading text-xl font-bold">Ouer Portaal</h1>
            <div className="flex items-center gap-4">
              <span className="text-text-secondary">Welkom, {parent?.name}</span>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="logout-btn">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Link Learner Card */}
          <Card testId="link-learner-card">
            <h3 className="font-heading font-bold mb-4">Koppel 'n Leerder</h3>
            <p className="text-text-secondary mb-4">
              Voer jou kind se <strong>naam en van</strong> in om hul vordering te sien.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                className="input-field"
                value={linkForm.name}
                onChange={(e) => setLinkForm({...linkForm, name: e.target.value})}
                placeholder="Naam (bv. Jan)"
                data-testid="link-name-input"
              />
              <input
                type="text"
                className="input-field"
                value={linkForm.surname}
                onChange={(e) => setLinkForm({...linkForm, surname: e.target.value})}
                placeholder="Van (bv. van der Berg)"
                data-testid="link-surname-input"
              />
            </div>
            <Button onClick={handleLinkLearner} disabled={linking} testId="link-learner-btn" className="w-full">
              {linking ? "Koppel..." : "Koppel Leerder"}
            </Button>
          </Card>

          {/* Weekly Progress - Generate & Copy for WhatsApp */}
          {parent?.learners?.length > 0 && (
            <Card testId="weekly-progress-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-heading font-bold">Weeklikse Opsomming</h3>
                  <p className="text-sm text-text-muted">Genereer en stuur via WhatsApp/SMS (gratis!)</p>
                </div>
                <Button 
                  onClick={generateProgressText} 
                  disabled={generatingText}
                  variant="secondary"
                  testId="generate-progress-btn"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {generatingText ? "Genereer..." : "Genereer"}
                </Button>
              </div>
              
              {showProgressText && progressText && (
                <div className="mt-4">
                  <div className="bg-slate-50 rounded-xl p-4 mb-3 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{progressText}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copyProgressText} testId="copy-progress-btn" className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Kopieer vir WhatsApp
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowProgressText(false)}
                      testId="close-progress-btn"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Linked Learners */}
          {parent?.learners?.length > 0 ? (
            <>
              <Card testId="learners-list">
                <h3 className="font-heading font-bold mb-4">Gekoppelde Leerders</h3>
                <div className="flex flex-wrap gap-3">
                  {parent.learners.map(learner => (
                    <button
                      key={learner.id}
                      onClick={() => setSelectedLearner(learner)}
                      className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                        selectedLearner?.id === learner.id 
                          ? "bg-primary-500 text-white" 
                          : "bg-slate-100 text-text-secondary hover:bg-slate-200"
                      }`}
                      data-testid={`learner-btn-${learner.id}`}
                    >
                      {learner.name} {learner.surname} (Gr. {learner.grade})
                    </button>
                  ))}
                </div>
              </Card>

              {/* Selected Learner Progress */}
              {selectedLearner && learnerProgress && (
                <Card testId="learner-progress">
                  <h3 className="font-heading font-bold mb-4">
                    {selectedLearner.name} se Vordering
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-primary-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-primary-600">
                        Gr. {selectedLearner.current_reading_level || selectedLearner.grade}
                      </div>
                      <div className="text-sm text-text-muted">Leesvlak</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {learnerProgress.results?.length || 0}
                      </div>
                      <div className="text-sm text-text-muted">Oefeninge Voltooi</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {learnerProgress.subscription?.active ? "Aktief" : "Onaktief"}
                      </div>
                      <div className="text-sm text-text-muted">Subskripsie</div>
                    </div>
                  </div>

                  {/* Recent Results */}
                  <h4 className="font-semibold mb-3">Onlangse Resultate</h4>
                  {learnerProgress.results?.length > 0 ? (
                    <div className="space-y-2">
                      {learnerProgress.results.slice(0, 10).map((result, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                          <div>
                            <span className="font-medium">{result.text_title || "Oefening"}</span>
                            <span className="text-sm text-text-muted ml-2">
                              ({result.exercise_type === "comprehension" ? "Begrip" : 
                                result.exercise_type === "reading" ? "Lees" : 
                                result.exercise_type === "spelling" ? "Spelling" : "Luister"})
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold ${result.score >= 70 ? "text-green-600" : "text-accent-500"}`}>
                              {result.score}%
                            </span>
                            <span className="text-xs text-text-muted">
                              {new Date(result.completed_at).toLocaleDateString("af-ZA")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted text-center py-4">Nog geen oefeninge voltooi nie</p>
                  )}
                </Card>
              )}
            </>
          ) : (
            <Card className="text-center py-8">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">Geen Leerders Gekoppel</h3>
              <p className="text-text-secondary">
                Koppel jou kind se rekening deur hul gebruikersnaam hierbo in te voer.
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Learner Dashboard
const LearnerDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readingTestStatus, setReadingTestStatus] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/progress"),
      api.get("/reading-test/status").catch(() => ({ data: null }))
    ])
      .then(([progressRes, testStatusRes]) => {
        setProgress(progressRes.data);
        setReadingTestStatus(testStatusRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const exerciseTypes = [
    { id: "comprehension", icon: BookOpen, title: "Begrip", desc: "Lees en beantwoord vrae", color: "bg-primary-500" },
    { id: "reading", icon: Mic, title: "Hardoplees", desc: "Neem jouself op", color: "bg-accent-500" },
    { id: "listening", icon: Headphones, title: "Luister", desc: "Luister en leer", color: "bg-secondary-500" },
    { id: "spelling", icon: Edit3, title: "Spelling", desc: "Oefen jou spelling", color: "bg-purple-500" },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laai...</div>;
  }

  const subscription = user?.subscription || {};

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-bold">Hallo, {user?.name}!</h1>
              <p className="text-text-muted text-sm">Graad {user?.current_reading_level || user?.grade}</p>
            </div>
            <button onClick={onLogout} className="p-2 text-text-muted hover:text-accent-500" data-testid="logout-btn">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Subscription Banner */}
        {!subscription.active && (
          <div className="bg-accent-500 text-white px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <p>Jou proeftydperk het verval</p>
              <Button variant="secondary" onClick={() => navigate("/subscription")} className="!py-2 !px-4" testId="subscribe-banner-btn">
                Teken In
              </Button>
            </div>
          </div>
        )}
        {subscription.active && subscription.type === "trial" && (
          <div className="bg-secondary-500 text-text-primary px-4 py-3">
            <div className="max-w-4xl mx-auto">
              <p>Proeftydperk: nog {subscription.days_left} dae oor</p>
            </div>
          </div>
        )}
        
        {/* Mandatory 3-month Reading Level Retest Banner */}
        {readingTestStatus?.needs_retest && (
          <div className="bg-purple-500 text-white px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <p>Dit is tyd vir jou 3-maandelikse leesvlaktoets!</p>
              </div>
              <Button variant="secondary" onClick={() => navigate("/reading-test")} className="!py-2 !px-4" testId="mandatory-retest-btn">
                Doen Toets Nou
              </Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Progress Summary */}
          <Card className="mb-6" testId="progress-card">
            <h2 className="font-heading text-lg font-bold mb-4">Jou Vordering</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary-500">{progress?.exercises_completed || 0}</div>
                <div className="text-sm text-text-muted">Oefeninge</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary-500">{progress?.average_score || 0}%</div>
                <div className="text-sm text-text-muted">Gemiddeld</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-500">{progress?.reading_wpm || 0}</div>
                <div className="text-sm text-text-muted">WPM</div>
              </div>
            </div>
            
            {/* Retake Reading Level Test Button */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Huidige Leesvlak: Graad {user?.current_reading_level || user?.grade}</p>
                  <p className="text-xs text-text-muted">Te hoog of te laag? Herdoen die toets.</p>
                </div>
                <button
                  onClick={() => navigate("/reading-test")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  data-testid="retake-reading-test-btn"
                >
                  <RefreshCw className="w-4 h-4" />
                  Herdoen Toets
                </button>
              </div>
            </div>
          </Card>

          {/* Exercise Types */}
          <h2 className="font-heading text-lg font-bold mb-4">Oefeninge</h2>
          <div className="grid grid-cols-2 gap-4">
            {exerciseTypes.map((ex) => (
              <Card
                key={ex.id}
                className="cursor-pointer"
                onClick={() => navigate(`/exercise/${ex.id}`)}
                testId={`exercise-${ex.id}`}
              >
                <div className={`w-12 h-12 ${ex.color} rounded-xl flex items-center justify-center mb-3`}>
                  <ex.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading font-semibold">{ex.title}</h3>
                <p className="text-sm text-text-muted">{ex.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="nav-bottom md:hidden">
          <div className="flex justify-around">
            <button className="nav-bottom-item active" data-testid="nav-home">
              <Home className="w-6 h-6" />
              <span className="text-xs mt-1">Tuis</span>
            </button>
            <button className="nav-bottom-item" onClick={() => navigate("/progress")} data-testid="nav-progress">
              <TrendingUp className="w-6 h-6" />
              <span className="text-xs mt-1">Vordering</span>
            </button>
            <button className="nav-bottom-item" onClick={() => navigate("/subscription")} data-testid="nav-subscription">
              <CreditCard className="w-6 h-6" />
              <span className="text-xs mt-1">Subskripsie</span>
            </button>
          </div>
        </nav>
      </div>
    </PageTransition>
  );
};

// Exercise Page
const ExercisePage = ({ user }) => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [answers, setAnswers] = useState([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  // Redo functionality state
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [lastSubmissionResult, setLastSubmissionResult] = useState(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  const exerciseType = window.location.pathname.split("/").pop();
  const typeLabels = {
    comprehension: "Begrip",
    reading: "Hardoplees",
    listening: "Luister",
    spelling: "Spelling"
  };

  useEffect(() => {
    api.get(`/exercises/${exerciseType}`)
      .then(res => {
        setExercises(res.data.exercises || []);
        if (res.data.exercises?.length > 0) {
          setCurrentExercise(res.data.exercises[0]);
        }
      })
      .catch(err => {
        if (err.response?.status === 402) {
          toast.error("Subskripsie vereis");
          navigate("/subscription");
        }
      })
      .finally(() => setLoading(false));
  }, [exerciseType, navigate]);

  // Reset state when exercise changes
  useEffect(() => {
    setAttemptNumber(1);
    setLastSubmissionResult(null);
    setShowCorrectAnswers(false);
    setAnswers([]);
  }, [currentExercise?.id]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      toast.error("Kon nie mikrofoon kry nie");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const submitRecording = async () => {
    if (!audioBlob || !currentExercise) return;
    
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("text_id", currentExercise.id);
    formData.append("expected_text", currentExercise.content);
    
    try {
      const res = await api.post("/reading-aloud/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAnalysisResult(res.data);
      if (res.data.analysis_success) {
        confetti({ particleCount: 50, spread: 60 });
        toast.success("Goed gedoen!");
      } else {
        toast.error(res.data.feedback_message || "Probeer weer");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie ontleed nie");
    }
  };

  const submitAnswers = async () => {
    try {
      const res = await api.post("/exercises/submit", {
        exercise_id: currentExercise.id,
        answers: answers,
        attempt_number: attemptNumber
      });
      
      // Calculate displayed score - 50% max on second attempt
      let displayScore = res.data.score;
      if (attemptNumber === 2) {
        displayScore = Math.round(res.data.score * 0.5);
      }
      
      setLastSubmissionResult({
        ...res.data,
        displayScore,
        attemptNumber
      });
      
      if (attemptNumber === 2) {
        // Show correct answers after second attempt
        setShowCorrectAnswers(true);
        toast.success(`Tweede poging: ${displayScore}% (50% van ${res.data.score}%)`);
      } else {
        toast.success(res.data.message);
      }
      
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      toast.error("Kon nie indien nie");
    }
  };

  // Handle redo - second attempt
  const handleRedo = () => {
    if (attemptNumber >= 2) {
      toast.error("Jy het reeds twee kanse gehad");
      return;
    }
    setAttemptNumber(2);
    setAnswers([]);
    setLastSubmissionResult(null);
    toast.info("Tweede kans! Let op: Hierdie poging tel slegs 50%");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laai...</div>;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2" data-testid="back-btn">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-heading text-xl font-bold">{typeLabels[exerciseType]}</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {exercises.length === 0 ? (
            <Card className="text-center">
              <p className="text-text-secondary">Geen oefeninge beskikbaar nie</p>
              <p className="text-sm text-text-muted mt-2">Die admin moet eers inhoud byvoeg</p>
            </Card>
          ) : (
            <Card testId="exercise-content">
              <h2 className="font-heading text-lg font-bold mb-4">{currentExercise?.title}</h2>
              
              {/* Content Display - HIDE for listening and spelling tests */}
              {exerciseType !== "listening" && exerciseType !== "spelling" && (
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">{currentExercise?.content}</p>
                </div>
              )}
              
              {/* Audio instruction for listening/spelling */}
              {(exerciseType === "listening" || exerciseType === "spelling") && (
                <div className="bg-primary-50 rounded-2xl p-6 mb-6 text-center">
                  <Headphones className="w-12 h-12 text-primary-500 mx-auto mb-3" />
                  <p className="text-lg font-medium text-primary-700">
                    {exerciseType === "listening" 
                      ? "Luister na die oudio en beantwoord die vrae" 
                      : "Luister na die woord en skryf dit korrek"}
                  </p>
                  <p className="text-sm text-primary-600 mt-2">
                    Klik op die oudio speler hieronder om te begin
                  </p>
                </div>
              )}

              {/* Reading Aloud */}
              {exerciseType === "reading" && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-4">
                    {!recording ? (
                      <Button onClick={startRecording} testId="start-recording-btn">
                        <Mic className="w-5 h-5 mr-2" /> Begin Opname
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} className="bg-accent-500" testId="stop-recording-btn">
                        <Pause className="w-5 h-5 mr-2" /> Stop Opname
                      </Button>
                    )}
                  </div>
                  
                  {recording && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="recording-indicator" />
                      <span className="text-accent-500 font-medium">Neem op...</span>
                    </div>
                  )}
                  
                  {audioBlob && !recording && (
                    <div className="text-center">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="mx-auto mb-4" />
                      <Button onClick={submitRecording} testId="submit-recording-btn">
                        Dien In vir Ontleding
                      </Button>
                    </div>
                  )}
                  
                  {analysisResult && (
                    <Card className={`${analysisResult.analysis_success ? 'bg-primary-50 border-primary-500' : 'bg-yellow-50 border-yellow-500'}`}>
                      <h3 className="font-heading font-bold mb-2">
                        {analysisResult.analysis_success ? 'Jou Resultaat' : 'Kon Nie Ontleed Nie'}
                      </h3>
                      
                      {/* Feedback message */}
                      {analysisResult.feedback_message && (
                        <div className={`p-3 rounded-lg mb-4 ${analysisResult.analysis_success ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          <p className="font-medium">{analysisResult.feedback_message}</p>
                        </div>
                      )}
                      
                      {/* Quality issues - show prominently */}
                      {analysisResult.quality_issues?.length > 0 && (
                        <div className="bg-accent-50 border border-accent-200 rounded-lg p-3 mb-4">
                          <p className="text-sm font-semibold text-accent-700 mb-2">Probleme met opname:</p>
                          <ul className="space-y-1">
                            {analysisResult.quality_issues.map((issue, i) => (
                              <li key={i} className="text-sm text-accent-600 flex items-start gap-2">
                                <span className="text-accent-500">⚠️</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysisResult.analysis_success && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-2xl font-bold text-primary-500">{analysisResult.wpm}</div>
                              <div className="text-sm text-text-muted">WPM</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-secondary-500">{analysisResult.word_count}</div>
                              <div className="text-sm text-text-muted">Woorde</div>
                            </div>
                          </div>
                          
                          {analysisResult.errors?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-semibold">Moontlike foute:</p>
                              <ul className="text-sm text-text-muted">
                                {analysisResult.errors.slice(0, 5).map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Try again button if failed */}
                      {!analysisResult.analysis_success && (
                        <Button 
                          onClick={() => {
                            setAnalysisResult(null);
                            setAudioBlob(null);
                          }} 
                          className="w-full mt-4"
                          testId="retry-recording-btn"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Probeer Weer
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              )}

              {/* Comprehension/Spelling - Questions from database */}
              {(exerciseType === "comprehension" || exerciseType === "spelling") && (
                <div className="space-y-4">
                  {/* Audio player for spelling tests */}
                  {exerciseType === "spelling" && currentExercise?.audio_url && (
                    <div className="bg-secondary-50 rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold text-secondary-700 mb-2">🔊 Luister na die woord:</p>
                      <audio 
                        controls 
                        src={`${BACKEND_URL}${currentExercise.audio_url}`} 
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {exerciseType === "spelling" && !currentExercise?.audio_url && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-center">
                      <p className="text-yellow-700">⚠️ Geen oudio beskikbaar vir hierdie toets nie</p>
                    </div>
                  )}
                  
                  {currentExercise?.questions && currentExercise.questions.length > 0 ? (
                    <>
                      {currentExercise.questions.map((question, idx) => (
                        <div key={question.id || idx} className="bg-slate-50 rounded-xl p-4">
                          <p className="font-semibold mb-3">{idx + 1}. {question.question_text}</p>
                          
                          {question.question_type === "multiple_choice" && question.options ? (
                            <div className="space-y-2">
                              {question.options.map((option, optIdx) => (
                                <label key={optIdx} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-primary-50 transition-colors">
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={answers[idx]?.answer === option}
                                    onChange={() => {
                                      const newAnswers = [...answers];
                                      newAnswers[idx] = { question_id: question.id, answer: option };
                                      setAnswers(newAnswers);
                                    }}
                                    className="w-5 h-5"
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <Input
                              placeholder="Tik jou antwoord hier..."
                              value={answers[idx]?.answer || ""}
                              onChange={(e) => {
                                const newAnswers = [...answers];
                                newAnswers[idx] = { question_id: question.id, answer: e.target.value };
                                setAnswers(newAnswers);
                              }}
                              testId={`answer-${idx}`}
                            />
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    // Fallback for old-style exercises without structured questions
                    <>
                      <p className="text-text-secondary">
                        {exerciseType === "spelling" ? "Skryf die woorde wat jy hoor:" : "Tik jou antwoorde in:"}
                      </p>
                      {/* Spelling: 10-20 words based on grade, Comprehension: 10 questions */}
                      {Array.from({ length: exerciseType === "spelling" 
                        ? Math.min(10 + (currentExercise?.grade_level || 1), 20) // 10-20 words for spelling
                        : 10 // 10 questions for comprehension
                      }, (_, i) => i + 1).map((num) => (
                        <Input
                          key={num}
                          label={exerciseType === "spelling" ? `Woord ${num}` : `Antwoord ${num}`}
                          value={answers[num - 1]?.answer || answers[num - 1] || ""}
                          onChange={(e) => {
                            const newAnswers = [...answers];
                            newAnswers[num - 1] = { question_id: `q${num}`, answer: e.target.value };
                            setAnswers(newAnswers);
                          }}
                          testId={`answer-${num}`}
                        />
                      ))}
                    </>
                  )}
                  
                  {/* Attempt indicator for comprehension */}
                  {attemptNumber === 2 && !lastSubmissionResult && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                      <p className="text-yellow-800 font-semibold flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Tweede Kans - Hierdie poging tel slegs 50%
                      </p>
                    </div>
                  )}
                  
                  {/* Show result and redo option */}
                  {lastSubmissionResult ? (
                    <div className="space-y-4">
                      <Card className={`${lastSubmissionResult.displayScore >= 70 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="text-center">
                          <div className="text-4xl font-bold mb-2">
                            {lastSubmissionResult.displayScore}%
                          </div>
                          <p className="text-text-secondary">
                            {lastSubmissionResult.attemptNumber === 2 
                              ? `(50% van ${lastSubmissionResult.score}% op 2de poging)` 
                              : `${lastSubmissionResult.earned_points}/${lastSubmissionResult.total_points} punte`}
                          </p>
                        </div>
                      </Card>
                      
                      {/* Show correct answers after 2nd attempt */}
                      {showCorrectAnswers && currentExercise?.questions && (
                        <Card className="bg-blue-50 border-blue-200">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5 text-blue-600" />
                            Korrekte Antwoorde:
                          </h4>
                          <div className="space-y-2">
                            {currentExercise.questions.map((q, idx) => {
                              const userAnswer = lastSubmissionResult.graded_answers?.[idx];
                              return (
                                <div key={q.id || idx} className="p-3 bg-white rounded-lg">
                                  <p className="font-medium text-sm">{idx + 1}. {q.question_text}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm text-green-600 font-semibold">
                                      Antwoord: {q.correct_answer}
                                    </span>
                                    {userAnswer && (
                                      <span className={`text-xs px-2 py-0.5 rounded ${userAnswer.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {userAnswer.is_correct ? '✓ Korrek' : `✗ Jou antwoord: ${userAnswer.user_answer || '-'}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      )}
                      
                      {/* Redo button - only show after first attempt, not after second */}
                      {attemptNumber === 1 && lastSubmissionResult.score < 100 && (
                        <Button 
                          onClick={handleRedo} 
                          variant="secondary" 
                          className="w-full"
                          testId="redo-btn"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Probeer Weer (2de kans - tel 50%)
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button onClick={submitAnswers} className="w-full" testId="submit-answers-btn">
                      Dien In {attemptNumber === 2 && "(50% telling)"}
                    </Button>
                  )}
                </div>
              )}

              {/* Listening - Audio Player with Questions */}
              {exerciseType === "listening" && (
                <div className="space-y-4">
                  {/* Audio Player */}
                  {currentExercise?.audio_url ? (
                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                      <p className="text-sm text-text-muted mb-2">Luister na die opname:</p>
                      <audio 
                        controls 
                        src={`${BACKEND_URL}${currentExercise.audio_url}`} 
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-slate-50 rounded-xl">
                      <Volume2 className="w-6 h-6 text-primary-500" />
                      <span className="text-text-muted">Geen oudio opgelaai nie</span>
                    </div>
                  )}
                  
                  {/* Questions */}
                  {currentExercise?.questions && currentExercise.questions.length > 0 ? (
                    currentExercise.questions.map((question, idx) => (
                      <div key={question.id || idx} className="bg-slate-50 rounded-xl p-4">
                        <p className="font-semibold mb-3">{idx + 1}. {question.question_text}</p>
                        
                        {question.question_type === "multiple_choice" && question.options ? (
                          <div className="space-y-2">
                            {question.options.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-primary-50 transition-colors">
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  value={option}
                                  checked={answers[idx]?.answer === option}
                                  onChange={() => {
                                    const newAnswers = [...answers];
                                    newAnswers[idx] = { question_id: question.id, answer: option };
                                    setAnswers(newAnswers);
                                  }}
                                  className="w-5 h-5"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <Input
                            placeholder="Tik jou antwoord hier..."
                            value={answers[idx]?.answer || ""}
                            onChange={(e) => {
                              const newAnswers = [...answers];
                              newAnswers[idx] = { question_id: question.id, answer: e.target.value };
                              setAnswers(newAnswers);
                            }}
                            testId={`listening-answer-${idx}`}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Listening: 5 questions */}
                      {[1, 2, 3, 4, 5].map((num) => (
                        <Input
                          key={num}
                          label={`Antwoord ${num}`}
                          value={answers[num - 1]?.answer || ""}
                          onChange={(e) => {
                            const newAnswers = [...answers];
                            newAnswers[num - 1] = { question_id: `q${num}`, answer: e.target.value };
                            setAnswers(newAnswers);
                          }}
                          testId={`listening-answer-${num}`}
                        />
                      ))}
                    </>
                  )}
                  <Button onClick={submitAnswers} className="w-full" testId="submit-listening-btn">
                    Dien In
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Subscription Page
const SubscriptionPage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [myPayments, setMyPayments] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    reference_used: user?.username || "",
    amount_paid: 0,
    payment_date: new Date().toISOString().split('T')[0],
    proof_description: ""
  });

  useEffect(() => {
    // Fetch subscription status, bank details, and payment history
    Promise.all([
      api.get("/subscription/status"),
      api.get("/payments/bank-details"),
      api.get("/payments/eft/my-payments").catch(() => ({ data: { payments: [] } }))
    ]).then(([subRes, bankRes, paymentsRes]) => {
      setSubscription(subRes.data);
      setBankDetails(bankRes.data);
      setMyPayments(paymentsRes.data.payments || []);
    }).catch(console.error);
  }, []);

  const handleSubmitPayment = async () => {
    if (!selectedPackage) {
      toast.error("Kies eers 'n pakket");
      return;
    }
    if (!paymentForm.reference_used) {
      toast.error("Voer die verwysing in wat jy gebruik het");
      return;
    }
    if (!paymentForm.amount_paid || paymentForm.amount_paid <= 0) {
      toast.error("Voer die bedrag in wat jy betaal het");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/payments/eft/submit", {
        package_id: selectedPackage,
        reference_used: paymentForm.reference_used,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_date: paymentForm.payment_date,
        proof_description: paymentForm.proof_description
      });
      toast.success(res.data.message);
      setShowPaymentForm(false);
      setSelectedPackage(null);
      // Refresh payments list
      const paymentsRes = await api.get("/payments/eft/my-payments");
      setMyPayments(paymentsRes.data.payments || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie betaling indien nie");
    }
    setLoading(false);
  };

  const selectPackage = (packageId, amount) => {
    setSelectedPackage(packageId);
    setPaymentForm(prev => ({ ...prev, amount_paid: amount }));
    setShowPaymentForm(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Gekopieer!");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-8">
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => navigate("/dashboard")} className="p-2" data-testid="back-from-sub">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-heading text-xl font-bold">Subskripsie & Betaling</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Current Subscription Status */}
          {subscription?.active && (
            <Card className="border-primary-500 bg-primary-50" testId="subscription-status">
              <div className="flex items-center gap-3">
                <Check className="w-8 h-8 text-primary-500" />
                <div>
                  <p className="font-bold">Aktiewe Subskripsie</p>
                  <p className="text-sm text-text-secondary">
                    {subscription.type === "trial" && `Proeftydperk - ${subscription.days_left} dae oor`}
                    {subscription.type === "monthly" && `Maandeliks - ${subscription.days_left} dae oor`}
                    {subscription.type === "lifetime" && "Lewenslange toegang"}
                    {subscription.type === "school" && `Skool - ${subscription.days_left} dae oor`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Bank Details Card */}
          {bankDetails && (
            <Card testId="bank-details-card">
              <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-500" />
                Bankbesonderhede vir EFT
              </h3>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Bank:</span>
                  <span className="font-semibold">{bankDetails.bank_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Rekeninghouer:</span>
                  <span className="font-semibold">{bankDetails.account_holder}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Rekeningnommer:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono">{bankDetails.account_number}</span>
                    <button 
                      onClick={() => copyToClipboard(bankDetails.account_number)}
                      className="p-1 hover:bg-slate-200 rounded"
                      data-testid="copy-account"
                    >
                      <Copy className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Takkode:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono">{bankDetails.branch_code}</span>
                    <button 
                      onClick={() => copyToClipboard(bankDetails.branch_code)}
                      className="p-1 hover:bg-slate-200 rounded"
                      data-testid="copy-branch"
                    >
                      <Copy className="w-4 h-4 text-text-muted" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Tipe Rekening:</span>
                  <span className="font-semibold">{bankDetails.account_type}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-sm text-primary-600 font-medium">
                    <strong>Verwysing:</strong> {bankDetails.reference_instructions}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Jou gebruikersnaam: <strong>{user?.username}</strong>
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Package Selection */}
          {!showPaymentForm ? (
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-lg">Kies 'n Pakket</h3>
              
              <Card className="border-2 border-slate-200 hover:border-primary-500 transition-colors cursor-pointer" 
                    onClick={() => selectPackage("monthly", 100)}
                    testId="monthly-option">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-heading text-lg font-bold">Maandeliks</h4>
                    <p className="text-text-secondary text-sm">Kanselleer enige tyd</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">R100</div>
                    <div className="text-sm text-text-muted">/maand</div>
                  </div>
                </div>
              </Card>

              <Card className="border-2 border-secondary-500 relative cursor-pointer hover:shadow-lg transition-shadow" 
                    onClick={() => selectPackage("once_off", 399)}
                    testId="once-off-option">
                <div className="absolute -top-3 right-4 bg-secondary-500 text-text-primary text-xs font-bold px-3 py-1 rounded-full">
                  BESTE WAARDE
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-heading text-lg font-bold">Eenmalig</h4>
                    <p className="text-text-secondary text-sm">Lewenslange toegang</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-secondary-600">R399</div>
                    <div className="text-sm text-text-muted">eenmalig</div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            /* Payment Submission Form */
            <Card testId="payment-form">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-lg">Betaling Kennisgewing</h3>
                <button 
                  onClick={() => { setShowPaymentForm(false); setSelectedPackage(null); }}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-primary-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-primary-700">
                  <strong>Gekose Pakket:</strong> {selectedPackage === "monthly" ? "Maandeliks (R100)" : "Eenmalig (R399)"}
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Verwysing wat jy gebruik het"
                  value={paymentForm.reference_used}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_used: e.target.value})}
                  placeholder="bv. jou gebruikersnaam"
                  testId="payment-reference"
                />
                
                <Input
                  label="Bedrag Betaal (R)"
                  type="number"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({...paymentForm, amount_paid: e.target.value})}
                  testId="payment-amount"
                />
                
                <Input
                  label="Datum van Betaling"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  testId="payment-date"
                />
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Addisionele Inligting (Opsioneel)
                  </label>
                  <textarea
                    className="input-field"
                    rows="2"
                    value={paymentForm.proof_description}
                    onChange={(e) => setPaymentForm({...paymentForm, proof_description: e.target.value})}
                    placeholder="bv. betaal via FNB app, verwysing nommer..."
                    data-testid="payment-description"
                  />
                </div>

                <Button 
                  onClick={handleSubmitPayment} 
                  disabled={loading} 
                  className="w-full"
                  testId="submit-payment"
                >
                  {loading ? "Besig..." : "Dien Betaling In"}
                </Button>
              </div>
            </Card>
          )}

          {/* Payment History */}
          {myPayments.length > 0 && (
            <Card testId="payment-history">
              <h3 className="font-heading font-bold text-lg mb-4">Betaling Geskiedenis</h3>
              <div className="space-y-3">
                {myPayments.map((payment, i) => (
                  <div key={payment.id || i} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="font-medium">{payment.package_name || payment.package_id}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(payment.created_at).toLocaleDateString("af-ZA")} - Verw: {payment.reference_used}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R{payment.amount_paid}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.payment_status === "paid" ? "bg-green-100 text-green-700" :
                        payment.payment_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {payment.payment_status === "paid" ? "Bevestig" : 
                         payment.payment_status === "pending" ? "Wag vir bevestiging" : "Afgekeur"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Texts Tab Component with questions, audio support, and folder view
const TextsTab = ({ texts, setTexts }) => {
  const [newText, setNewText] = useState({ 
    title: "", content: "", grade_level: 1, text_type: "comprehension", questions: [] 
  });
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: "", question_type: "typed", options: ["", "", "", ""], correct_answer: "", points: 10
  });
  const [expandedText, setExpandedText] = useState(null);
  const [uploadingAudio, setUploadingAudio] = useState(null);
  const audioInputRef = useRef(null);
  
  // Edit mode state
  const [editingText, setEditingText] = useState(null);
  const [editForm, setEditForm] = useState(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTextId, setRecordingTextId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Folder View State
  const [viewMode, setViewMode] = useState("folders"); // "folders" or "list"
  const [expandedGrade, setExpandedGrade] = useState(null);
  const [expandedType, setExpandedType] = useState(null);
  
  // Text type labels in Afrikaans
  const textTypeLabels = {
    comprehension: "Begripstoets",
    reading: "Hardoplees",
    spelling: "Spelling",
    listening: "Luistertoets"
  };
  
  // Organize texts by grade and type
  const getTextsByGradeAndType = () => {
    const organized = {};
    for (let grade = 1; grade <= 9; grade++) {
      organized[grade] = {
        comprehension: [],
        reading: [],
        spelling: [],
        listening: []
      };
    }
    texts.forEach(text => {
      const grade = text.grade_level;
      const type = text.text_type;
      if (organized[grade] && organized[grade][type]) {
        organized[grade][type].push(text);
      }
    });
    return organized;
  };
  
  const organizedTexts = getTextsByGradeAndType();
  
  // Count texts by grade
  const getGradeCount = (grade) => {
    const gradeTexts = organizedTexts[grade];
    return Object.values(gradeTexts).reduce((acc, arr) => acc + arr.length, 0);
  };
  
  // Count texts by type within a grade
  const getTypeCount = (grade, type) => {
    return organizedTexts[grade][type].length;
  };

  const addQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.correct_answer) {
      toast.error("Vraag en korrekte antwoord is nodig");
      return;
    }
    const questionToAdd = {
      ...currentQuestion,
      id: `q_${Date.now()}`,
      options: currentQuestion.question_type === "multiple_choice" 
        ? currentQuestion.options.filter(o => o.trim()) 
        : []
    };
    setNewText({
      ...newText,
      questions: [...newText.questions, questionToAdd]
    });
    setCurrentQuestion({
      question_text: "", question_type: "typed", options: ["", "", "", ""], correct_answer: "", points: 10
    });
    setShowQuestionForm(false);
    toast.success("Vraag bygevoeg!");
  };

  const removeQuestion = (index) => {
    setNewText({
      ...newText,
      questions: newText.questions.filter((_, i) => i !== index)
    });
  };

  const handleCreateText = async () => {
    if (!newText.title || !newText.content) {
      toast.error("Titel en inhoud is nodig");
      return;
    }
    try {
      await api.post("/texts", newText);
      toast.success("Teks geskep!");
      const res = await api.get("/texts");
      setTexts(res.data);
      setNewText({ title: "", content: "", grade_level: 1, text_type: "comprehension", questions: [] });
    } catch (err) {
      toast.error("Kon nie teks skep nie");
    }
  };

  const handleDeleteText = async (textId) => {
    try {
      await api.delete(`/texts/${textId}`);
      toast.success("Teks verwyder!");
      const res = await api.get("/texts");
      setTexts(res.data);
    } catch (err) {
      toast.error("Kon nie teks verwyder nie");
    }
  };

  const handleAudioUpload = async (textId, file) => {
    setUploadingAudio(textId);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await api.post(`/texts/${textId}/audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Oudio opgelaai!");
      const res = await api.get("/texts");
      setTexts(res.data);
    } catch (err) {
      toast.error("Kon nie oudio oplaai nie");
    }
    setUploadingAudio(null);
  };

  // Start editing a text
  const handleStartEdit = (text) => {
    setEditingText(text.id);
    setEditForm({
      title: text.title,
      content: text.content,
      grade_level: text.grade_level,
      text_type: text.text_type,
      questions: text.questions || []
    });
  };

  // Save edited text
  const handleSaveEdit = async () => {
    if (!editForm.title || !editForm.content) {
      toast.error("Titel en inhoud is nodig");
      return;
    }
    try {
      await api.put(`/texts/${editingText}`, editForm);
      toast.success("Teks opgedateer!");
      const res = await api.get("/texts");
      setTexts(res.data);
      setEditingText(null);
      setEditForm(null);
    } catch (err) {
      toast.error("Kon nie teks opdateer nie");
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingText(null);
    setEditForm(null);
  };

  // Start audio recording
  const startRecording = async (textId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Upload the recorded audio
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        
        try {
          await api.post(`/texts/${textId}/audio`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          toast.success("Opname opgelaai!");
          const res = await api.get("/texts");
          setTexts(res.data);
        } catch (err) {
          toast.error("Kon nie opname oplaai nie");
        }
        setRecordingTextId(null);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTextId(textId);
      toast.success("Opname begin - praat nou!");
    } catch (err) {
      toast.error("Kon nie mikrofoon kry nie - gee asseblief toestemming");
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Opname gestop - laai op...");
    }
  };
        
  // Render text item for folder view - now with audio support
  const renderTextItem = (text) => (
    <div key={text.id} className="bg-white border rounded-lg p-3 hover:border-primary-200 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <FileText className="w-4 h-4 text-primary-500" />
          <span className="font-medium text-sm">{text.title}</span>
          {text.audio_url && <Volume2 className="w-3 h-3 text-primary-500" title="Het oudio" />}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => handleStartEdit(text)}
            className="p-1 text-primary-500 hover:bg-primary-50 rounded"
            data-testid={`edit-text-folder-${text.id}`}
            title="Wysig"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDeleteText(text.id)}
            className="p-1 text-accent-500 hover:bg-accent-50 rounded"
            data-testid={`delete-text-folder-${text.id}`}
            title="Verwyder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-text-muted mt-1 ml-6">
        {text.is_ai_generated ? "AI" : "Handmatig"}
        {text.questions?.length > 0 && ` | ${text.questions.length} vrae`}
      </p>
      
      {/* Audio Upload/Record for Listening & Spelling */}
      {(text.text_type === "listening" || text.text_type === "spelling") && (
        <div className="mt-3 pt-3 border-t ml-6">
          {text.audio_url ? (
            <div className="mb-2">
              <audio controls src={`${BACKEND_URL}${text.audio_url}`} className="w-full h-8" />
            </div>
          ) : (
            <p className="text-xs text-yellow-600 mb-2">⚠️ Geen oudio - laai op of neem op</p>
          )}
          
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept="audio/*"
              id={`audio-upload-${text.id}`}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAudioUpload(text.id, e.target.files[0])}
            />
            <button
              onClick={() => document.getElementById(`audio-upload-${text.id}`)?.click()}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
              disabled={uploadingAudio === text.id || isRecording}
              data-testid={`upload-audio-folder-${text.id}`}
            >
              <Upload className="w-3 h-3" />
              {uploadingAudio === text.id ? "Laai..." : "Laai Op"}
            </button>
            
            {isRecording && recordingTextId === text.id ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors animate-pulse"
                data-testid={`stop-rec-folder-${text.id}`}
              >
                <Pause className="w-3 h-3" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => startRecording(text.id)}
                className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                disabled={isRecording}
                data-testid={`start-rec-folder-${text.id}`}
              >
                <Mic className="w-3 h-3" />
                Neem Op
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card testId="add-text-form">
        <h3 className="font-heading font-bold mb-4">Voeg Nuwe Teks By</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Titel"
            value={newText.title}
            onChange={(e) => setNewText({...newText, title: e.target.value})}
            testId="text-title-input"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">Graad</label>
              <select
                className="input-field"
                value={newText.grade_level}
                onChange={(e) => setNewText({...newText, grade_level: parseInt(e.target.value)})}
                data-testid="text-grade-select"
              >
                {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>Graad {g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-2">Tipe</label>
              <select
                className="input-field"
                value={newText.text_type}
                onChange={(e) => setNewText({...newText, text_type: e.target.value})}
                data-testid="text-type-select"
              >
                <option value="comprehension">Begripstoets</option>
                <option value="reading">Hardoplees</option>
                <option value="spelling">Spelling</option>
                <option value="listening">Luistertoets</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-text-secondary mb-2">Inhoud / Teks</label>
          <textarea
            className="input-field min-h-32"
            value={newText.content}
            onChange={(e) => setNewText({...newText, content: e.target.value})}
            placeholder="Tik of plak die teks hier wat die leerders moet lees..."
            data-testid="text-content-input"
          />
        </div>

        {/* Questions Section */}
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Vrae ({newText.questions.length})</h4>
            <button
              onClick={() => setShowQuestionForm(!showQuestionForm)}
              className="text-primary-500 text-sm font-medium hover:underline"
              data-testid="add-question-btn"
            >
              + Voeg Vraag By
            </button>
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <Input
                label="Vraag"
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
                placeholder="bv. Wat is die hond se naam?"
                testId="question-text-input"
              />
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Tipe</label>
                  <select
                    className="input-field"
                    value={currentQuestion.question_type}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, question_type: e.target.value})}
                    data-testid="question-type-select"
                  >
                    <option value="typed">Tik Antwoord</option>
                    <option value="multiple_choice">Meervoudige Keuse</option>
                  </select>
                </div>
                <Input
                  label="Punte"
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value) || 10})}
                  testId="question-points-input"
                />
              </div>

              {currentQuestion.question_type === "multiple_choice" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Opsies (minstens 2)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentQuestion.options.map((opt, i) => (
                      <input
                        key={i}
                        type="text"
                        className="input-field"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...currentQuestion.options];
                          newOpts[i] = e.target.value;
                          setCurrentQuestion({...currentQuestion, options: newOpts});
                        }}
                        placeholder={`Opsie ${i + 1}`}
                        data-testid={`option-${i}-input`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Input
                label="Korrekte Antwoord"
                value={currentQuestion.correct_answer}
                onChange={(e) => setCurrentQuestion({...currentQuestion, correct_answer: e.target.value})}
                placeholder="Die presiese korrekte antwoord"
                testId="correct-answer-input"
              />

              <div className="flex gap-2 mt-4">
                <Button onClick={addQuestion} testId="save-question-btn">Voeg By</Button>
                <button 
                  onClick={() => setShowQuestionForm(false)}
                  className="px-4 py-2 text-text-muted hover:text-text-primary"
                >
                  Kanselleer
                </button>
              </div>
            </div>
          )}

          {/* Added Questions List */}
          {newText.questions.length > 0 && (
            <div className="space-y-2">
              {newText.questions.map((q, i) => (
                <div key={q.id || i} className="flex items-center justify-between bg-white border rounded-lg p-3">
                  <div className="flex-1">
                    <span className="font-medium">{i + 1}. {q.question_text}</span>
                    <span className="text-xs ml-2 text-text-muted">
                      ({q.question_type === "multiple_choice" ? "Keuse" : "Tik"} | {q.points} punte)
                    </span>
                  </div>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="p-1 text-accent-500 hover:bg-accent-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note for listening/spelling tests */}
        {(newText.text_type === "listening" || newText.text_type === "spelling") && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>📢 Nota:</strong> Nadat jy die teks gestoor het, kan jy oudio oplaai of opneem. 
              Scroll af na die gestoorde teks en klik op die oudio knoppies.
            </p>
          </div>
        )}

        <Button onClick={handleCreateText} className="mt-4 w-full" testId="save-text-btn">
          Stoor Teks
        </Button>
      </Card>

      {/* Quick Audio Upload Section - Shows texts that need audio */}
      {texts.filter(t => (t.text_type === "listening" || t.text_type === "spelling") && !t.audio_url).length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200" testId="needs-audio-section">
          <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Tekste wat Oudio Benodig</h4>
          <div className="space-y-3">
            {texts.filter(t => (t.text_type === "listening" || t.text_type === "spelling") && !t.audio_url).map(text => (
              <div key={text.id} className="bg-white rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{text.title}</span>
                    <span className="text-xs text-text-muted ml-2">
                      (Graad {text.grade_level} | {textTypeLabels[text.text_type]})
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="audio/*"
                    id={`quick-audio-${text.id}`}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleAudioUpload(text.id, e.target.files[0])}
                  />
                  <button
                    onClick={() => document.getElementById(`quick-audio-${text.id}`)?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
                    disabled={uploadingAudio === text.id}
                    data-testid={`quick-upload-${text.id}`}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingAudio === text.id ? "Laai op..." : "Laai Oudio Op"}
                  </button>
                  
                  {isRecording && recordingTextId === text.id ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-3 py-2 bg-accent-500 text-white rounded-lg text-sm hover:bg-accent-600 transition-colors animate-pulse"
                      data-testid={`quick-stop-${text.id}`}
                    >
                      <Pause className="w-4 h-4" />
                      Stop Opname
                    </button>
                  ) : (
                    <button
                      onClick={() => startRecording(text.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                      disabled={isRecording}
                      data-testid={`quick-record-${text.id}`}
                    >
                      <Mic className="w-4 h-4" />
                      Neem Op
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Export/Import Section */}
      <Card className="bg-slate-50" testId="export-import-section">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">Rugsteun & Herstel</h4>
            <p className="text-xs text-text-muted">Laai af of voer tekste in om data te behou</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".json"
              className="hidden"
              id="import-texts-file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                try {
                  const content = await file.text();
                  const data = JSON.parse(content);
                  
                  const res = await api.post("/texts/import/bulk", data);
                  toast.success(res.data.message);
                  
                  // Reload texts
                  const textsRes = await api.get("/texts");
                  setTexts(textsRes.data);
                } catch (err) {
                  toast.error("Kon nie invoer nie: " + (err.response?.data?.detail || err.message));
                }
                e.target.value = "";
              }}
            />
            <button
              onClick={async () => {
                try {
                  const res = await api.get("/texts/export/all");
                  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `lees-is-duidelik-tekste-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`${res.data.total_texts} tekste afgelaai!`);
                } catch (err) {
                  toast.error("Kon nie uitvoer nie");
                }
              }}
              className="px-3 py-1.5 bg-secondary-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-secondary-600"
              data-testid="export-texts-btn"
            >
              <ChevronDown className="w-4 h-4" /> Uitvoer
            </button>
            <button
              onClick={() => document.getElementById("import-texts-file")?.click()}
              className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-primary-600"
              data-testid="import-texts-btn"
            >
              <ChevronUp className="w-4 h-4" /> Invoer
            </button>
          </div>
        </div>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">Bestaande Tekste ({texts.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("folders")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ${
              viewMode === "folders" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary hover:bg-slate-200"
            }`}
            data-testid="folder-view-btn"
          >
            <Folder className="w-4 h-4" /> Vouers
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ${
              viewMode === "list" ? "bg-primary-500 text-white" : "bg-slate-100 text-text-secondary hover:bg-slate-200"
            }`}
            data-testid="list-view-btn"
          >
            <FileText className="w-4 h-4" /> Lys
          </button>
        </div>
      </div>

      {/* Folder View */}
      {viewMode === "folders" && (
        <div className="space-y-3">
          {texts.length === 0 ? (
            <Card><p className="text-text-muted">Geen tekste geskep nie</p></Card>
          ) : (
            [1,2,3,4,5,6,7,8,9].map(grade => {
              const gradeCount = getGradeCount(grade);
              const isGradeExpanded = expandedGrade === grade;
              
              return (
                <Card key={grade} className="!p-0 overflow-hidden" testId={`grade-folder-${grade}`}>
                  <button
                    onClick={() => setExpandedGrade(isGradeExpanded ? null : grade)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    data-testid={`expand-grade-${grade}`}
                  >
                    <div className="flex items-center gap-3">
                      {isGradeExpanded ? (
                        <FolderOpen className="w-6 h-6 text-primary-500" />
                      ) : (
                        <Folder className="w-6 h-6 text-slate-400" />
                      )}
                      <span className="font-semibold">Graad {grade}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${gradeCount > 0 ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                        {gradeCount} tekste
                      </span>
                    </div>
                    {isGradeExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  
                  {isGradeExpanded && (
                    <div className="border-t bg-slate-50 p-4 space-y-3">
                      {["comprehension", "reading", "spelling", "listening"].map(type => {
                        const typeCount = getTypeCount(grade, type);
                        const isTypeExpanded = expandedType === `${grade}-${type}`;
                        const typeTexts = organizedTexts[grade][type];
                        
                        return (
                          <div key={type} className="bg-white rounded-lg border overflow-hidden">
                            <button
                              onClick={() => setExpandedType(isTypeExpanded ? null : `${grade}-${type}`)}
                              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                              data-testid={`expand-type-${grade}-${type}`}
                            >
                              <div className="flex items-center gap-2">
                                {isTypeExpanded ? (
                                  <FolderOpen className="w-5 h-5 text-secondary-500" />
                                ) : (
                                  <Folder className="w-5 h-5 text-slate-300" />
                                )}
                                <span className="font-medium text-sm">{textTypeLabels[type]}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${typeCount > 0 ? "bg-secondary-100 text-secondary-700" : "bg-slate-100 text-slate-500"}`}>
                                  {typeCount}
                                </span>
                              </div>
                              {isTypeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            {isTypeExpanded && (
                              <div className="border-t p-3 space-y-2 bg-slate-50">
                                {typeTexts.length === 0 ? (
                                  <p className="text-sm text-text-muted text-center py-2">Geen tekste in hierdie kategorie nie</p>
                                ) : (
                                  typeTexts.map(text => renderTextItem(text))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* List View (Original) */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {texts.length === 0 ? (
            <Card><p className="text-text-muted">Geen tekste geskep nie</p></Card>
          ) : (
            texts.map(text => (
              <Card key={text.id} testId={`text-${text.id}`}>
                {editingText === text.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary-500">Wysig Teks</h4>
                    <Input
                      label="Titel"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-2">Graad</label>
                        <select
                          className="input-field"
                          value={editForm.grade_level}
                          onChange={(e) => setEditForm({...editForm, grade_level: parseInt(e.target.value)})}
                        >
                          {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>Graad {g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-2">Tipe</label>
                        <select
                          className="input-field"
                          value={editForm.text_type}
                          onChange={(e) => setEditForm({...editForm, text_type: e.target.value})}
                        >
                          <option value="comprehension">Begripstoets</option>
                          <option value="reading">Hardoplees</option>
                          <option value="spelling">Spelling</option>
                          <option value="listening">Luistertoets</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-secondary mb-2">Inhoud</label>
                      <textarea
                        className="input-field min-h-[150px]"
                        value={editForm.content}
                        onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleSaveEdit} testId={`save-edit-${text.id}`}>
                        Stoor Wysigings
                      </Button>
                      <Button variant="secondary" onClick={handleCancelEdit} testId={`cancel-edit-${text.id}`}>
                        Kanselleer
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{text.title}</h4>
                        {text.audio_url && <Volume2 className="w-4 h-4 text-primary-500" title="Het oudio" />}
                      </div>
                      <p className="text-sm text-text-muted">
                        Graad {text.grade_level} | {textTypeLabels[text.text_type] || text.text_type} | 
                        {text.is_ai_generated ? " AI" : " Handmatig"}
                        {text.questions?.length > 0 && ` | ${text.questions.length} vrae`}
                      </p>
                      
                      <button
                        onClick={() => setExpandedText(expandedText === text.id ? null : text.id)}
                        className="text-sm text-primary-500 mt-1 flex items-center gap-1"
                      >
                        {expandedText === text.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {expandedText === text.id ? "Versteek" : "Wys meer"}
                      </button>
                      
                      {expandedText === text.id && (
                        <div className="mt-3 bg-slate-50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">{text.content}</p>
                          
                          {text.questions?.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <p className="text-sm font-semibold mb-2">Vrae:</p>
                              {text.questions.map((q, i) => (
                                <div key={q.id || i} className="text-sm mb-2">
                                  <span className="font-medium">{i + 1}. {q.question_text}</span>
                                  <span className="text-text-muted ml-2">(Antw: {q.correct_answer})</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Audio Upload & Recording for Listening/Spelling */}
                          {(text.text_type === "listening" || text.text_type === "spelling") && (
                            <div className="mt-3 border-t pt-3">
                              <p className="text-sm font-semibold mb-2">Oudio Opname:</p>
                              {text.audio_url ? (
                                <audio controls src={`${BACKEND_URL}${text.audio_url}`} className="w-full" />
                              ) : (
                                <p className="text-sm text-text-muted">Geen oudio opgelaai nie</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mt-3">
                                {/* Upload Audio File */}
                                <input
                                  type="file"
                                  accept="audio/*"
                                  ref={audioInputRef}
                                  className="hidden"
                                  onChange={(e) => e.target.files?.[0] && handleAudioUpload(text.id, e.target.files[0])}
                                />
                                <button
                                  onClick={() => audioInputRef.current?.click()}
                                  className="flex items-center gap-2 text-sm px-3 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                                  disabled={uploadingAudio === text.id || isRecording}
                                  data-testid={`upload-audio-${text.id}`}
                                >
                                  <Upload className="w-4 h-4" />
                                  {uploadingAudio === text.id ? "Laai op..." : "Laai Lêer Op"}
                                </button>
                                
                                {/* Record Audio */}
                                {isRecording && recordingTextId === text.id ? (
                                  <button
                                    onClick={stopRecording}
                                    className="flex items-center gap-2 text-sm px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors animate-pulse"
                                    data-testid={`stop-recording-${text.id}`}
                                  >
                                    <Pause className="w-4 h-4" />
                                    Stop Opname
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startRecording(text.id)}
                                    className="flex items-center gap-2 text-sm px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                    disabled={isRecording}
                                    data-testid={`start-recording-${text.id}`}
                                  >
                                    <Mic className="w-4 h-4" />
                                    Neem Op
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStartEdit(text)}
                        className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
                        data-testid={`edit-text-${text.id}`}
                        title="Wysig teks"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteText(text.id)}
                        className="p-2 text-accent-500 hover:bg-accent-50 rounded-lg"
                        data-testid={`delete-text-${text.id}`}
                        title="Verwyder teks"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Learners Tab Component with detailed view and messaging
const LearnersTab = ({ learners, setLearners }) => {
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [learnerDetail, setLearnerDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState("progress_report");
  const [customMessage, setCustomMessage] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});

  const loadLearnerDetail = async (learnerId) => {
    setLoading(true);
    try {
      const res = await api.get(`/learners/${learnerId}`);
      setLearnerDetail(res.data);
      setContactForm({
        parent_email: res.data.learner.parent_email || "",
        parent_whatsapp: res.data.learner.parent_whatsapp || "",
        parent_phone: res.data.learner.parent_phone || ""
      });
    } catch (err) {
      toast.error("Kon nie leerder inligting laai nie");
    }
    setLoading(false);
  };

  const handleSelectLearner = (learner) => {
    setSelectedLearner(learner);
    loadLearnerDetail(learner.learner.id);
    setGeneratedMessage(null);
  };

  const generateNotification = async () => {
    try {
      const res = await api.post("/notifications/generate", {
        learner_id: learnerDetail.learner.id,
        message_type: messageType,
        custom_message: messageType === "custom" ? customMessage : null
      });
      setGeneratedMessage(res.data);
      toast.success("Boodskap gegenereer!");
    } catch (err) {
      toast.error("Kon nie boodskap genereer nie");
    }
  };

  const copyMessage = () => {
    if (generatedMessage?.message) {
      navigator.clipboard.writeText(generatedMessage.message);
      toast.success("Boodskap gekopieer! Stuur via WhatsApp.");
    }
  };

  const saveContact = async () => {
    try {
      await api.put(`/learners/${learnerDetail.learner.id}`, contactForm);
      toast.success("Kontakbesonderhede opgedateer!");
      setEditingContact(false);
      loadLearnerDetail(learnerDetail.learner.id);
    } catch (err) {
      toast.error("Kon nie opdateer nie");
    }
  };

  const generateParentLink = async () => {
    try {
      const res = await api.post("/parent/generate-link", {
        learner_id: learnerDetail.learner.id
      });
      const parentUrl = `${window.location.origin}/parent/${res.data.token}`;
      navigator.clipboard.writeText(parentUrl);
      toast.success("Ouer portaal skakel gekopieer!");
    } catch (err) {
      toast.error("Kon nie skakel skep nie");
    }
  };

  if (selectedLearner && learnerDetail) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => { setSelectedLearner(null); setLearnerDetail(null); }}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Terug na lys
        </button>

        {loading ? (
          <Card><p className="text-center">Laai...</p></Card>
        ) : (
          <>
            {/* Learner Info Card */}
            <Card testId="learner-detail-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold">
                    {learnerDetail.learner.name} {learnerDetail.learner.surname}
                  </h2>
                  <p className="text-text-secondary">
                    Graad {learnerDetail.learner.grade} | 
                    Leesvlak: Graad {learnerDetail.learner.current_reading_level}
                    {learnerDetail.learner.school_name && ` | ${learnerDetail.learner.school_name}`}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  learnerDetail.subscription?.active 
                    ? "bg-primary-100 text-primary-700" 
                    : "bg-accent-100 text-accent-700"
                }`}>
                  {learnerDetail.subscription?.active ? "Aktief" : "Onaktief"}
                </div>
              </div>

              {/* Contact Details */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Kontakbesonderhede</h3>
                  <button 
                    onClick={() => setEditingContact(!editingContact)}
                    className="text-primary-500 text-sm"
                  >
                    {editingContact ? "Kanselleer" : "Wysig"}
                  </button>
                </div>

                {editingContact ? (
                  <div className="space-y-3">
                    <Input
                      label="Ouer E-pos"
                      type="email"
                      value={contactForm.parent_email}
                      onChange={(e) => setContactForm({...contactForm, parent_email: e.target.value})}
                      testId="edit-parent-email"
                    />
                    <Input
                      label="WhatsApp Nommer"
                      value={contactForm.parent_whatsapp}
                      onChange={(e) => setContactForm({...contactForm, parent_whatsapp: e.target.value})}
                      placeholder="bv. 0821234567"
                      testId="edit-parent-whatsapp"
                    />
                    <Input
                      label="Telefoonnommer"
                      value={contactForm.parent_phone}
                      onChange={(e) => setContactForm({...contactForm, parent_phone: e.target.value})}
                      testId="edit-parent-phone"
                    />
                    <Button onClick={saveContact} testId="save-contact-btn">
                      Stoor
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-muted" />
                      <span>{learnerDetail.learner.parent_email || "Nie verskaf nie"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-text-muted" />
                      <span>{learnerDetail.learner.parent_whatsapp || "Nie verskaf nie"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-text-muted" />
                      <span>{learnerDetail.learner.parent_phone || "Nie verskaf nie"}</span>
                    </div>
                  </div>
                )}
                
                {/* Parent Portal Link Button */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={generateParentLink}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-secondary-100 text-secondary-700 rounded-xl hover:bg-secondary-200 transition-colors font-medium"
                    data-testid="generate-parent-link-btn"
                  >
                    <Users className="w-5 h-5" />
                    Skep Ouer Portaal Skakel
                  </button>
                  <p className="text-xs text-text-muted mt-2 text-center">
                    Stuur hierdie skakel aan die ouer sodat hulle hul kind se vordering kan sien en betaal.
                  </p>
                </div>
              </div>
            </Card>

            {/* Stats Card */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <div className="text-3xl font-bold text-primary-500">{learnerDetail.stats.exercises_completed}</div>
                <div className="text-sm text-text-muted">Oefeninge</div>
              </Card>
              <Card className="text-center">
                <div className="text-3xl font-bold text-primary-500">{learnerDetail.stats.average_score}%</div>
                <div className="text-sm text-text-muted">Gemiddeld</div>
              </Card>
              <Card className="text-center">
                <div className="text-3xl font-bold text-primary-500">{learnerDetail.stats.reading_wpm}</div>
                <div className="text-sm text-text-muted">WPM</div>
              </Card>
            </div>

            {/* Reading Level Report */}
            <Card testId="reading-report-card">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                <FileBarChart className="w-5 h-5" /> Leesvlak Verslag
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Genereer 'n leesvlak verslag om met die skool te deel.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Begin Vlak:</span>
                    <span className="font-semibold ml-2">Graad {learnerDetail.learner.initial_reading_level || learnerDetail.learner.grade}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Huidige Vlak:</span>
                    <span className="font-semibold ml-2">Graad {learnerDetail.learner.current_reading_level}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Begin WPM:</span>
                    <span className="font-semibold ml-2">{learnerDetail.learner.initial_wpm || 0}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Huidige WPM:</span>
                    <span className="font-semibold ml-2">{learnerDetail.learner.current_wpm || learnerDetail.learner.initial_wpm || 0}</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={async () => {
                  try {
                    const res = await api.get(`/reading-test/report/${learnerDetail.learner.id}`);
                    const report = res.data;
                    
                    // Format report as shareable text
                    const reportText = `📊 LEESVLAK VERSLAG - ${report.learner.name} ${report.learner.surname}
━━━━━━━━━━━━━━━━━━━━━━━━
📚 Skool: ${report.learner.school_name || "Nie gespesifiseer"}
📅 Graad: ${report.learner.grade}

📈 VORDERING:
• Begin Vlak: Graad ${report.reading_progress.initial_level}
• Huidige Vlak: Graad ${report.reading_progress.current_level}
• ${report.reading_progress.improvement_summary}

⏱️ LEESSPOED:
• Begin WPM: ${report.reading_progress.initial_wpm}
• Huidige WPM: ${report.reading_progress.current_wpm}
• Verbetering: ${report.reading_progress.wpm_improvement > 0 ? '+' : ''}${report.reading_progress.wpm_improvement} WPM

📝 Toetse Voltooi: ${report.tests_completed}
━━━━━━━━━━━━━━━━━━━━━━━━
Gegenereer: ${new Date(report.report_generated_at).toLocaleDateString("af-ZA")}
Lees is Duidelik`;

                    navigator.clipboard.writeText(reportText);
                    toast.success("Verslag gekopieer! Deel met die skool.");
                  } catch (err) {
                    toast.error("Kon nie verslag genereer nie");
                  }
                }}
                className="w-full"
                testId="generate-reading-report-btn"
              >
                <FileBarChart className="w-4 h-4 mr-2" /> Genereer & Kopieer Verslag
              </Button>
            </Card>

            {/* Message Generator */}
            <Card testId="message-generator">
              <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" /> Stuur Kennisgewing
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Genereer 'n boodskap om via WhatsApp te stuur (kopieer en stuur self).
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-text-secondary mb-2">Boodskap Tipe</label>
                <select
                  className="input-field"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  data-testid="message-type-select"
                >
                  <option value="progress_report">Vorderingsverslag</option>
                  <option value="billing">Subskripsie Herinnering</option>
                  <option value="custom">Persoonlike Boodskap</option>
                </select>
              </div>

              {messageType === "custom" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Jou Boodskap</label>
                  <textarea
                    className="input-field min-h-[100px]"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Tik jou boodskap hier..."
                    data-testid="custom-message-input"
                  />
                </div>
              )}

              <Button onClick={generateNotification} className="w-full" testId="generate-message-btn">
                Genereer Boodskap
              </Button>

              {generatedMessage && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Gegenereerde Boodskap:</span>
                    <button
                      onClick={copyMessage}
                      className="flex items-center gap-1 text-primary-500 hover:bg-primary-50 px-2 py-1 rounded"
                      data-testid="copy-message-btn"
                    >
                      <ClipboardCopy className="w-4 h-4" /> Kopieer
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded border">
                    {generatedMessage.message}
                  </pre>
                  {generatedMessage.parent_whatsapp && (
                    <p className="text-sm text-text-muted mt-2">
                      WhatsApp: {generatedMessage.parent_whatsapp}
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Recent Results */}
            <Card>
              <h3 className="font-heading font-bold mb-4">Onlangse Resultate</h3>
              {learnerDetail.recent_results?.length === 0 ? (
                <p className="text-text-muted">Geen resultate nog nie</p>
              ) : (
                <div className="space-y-2">
                  {learnerDetail.recent_results?.slice(0, 10).map((result, idx) => (
                    <div key={result.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="font-medium">{result.exercise_type}</span>
                        <span className="text-sm text-text-muted ml-2">
                          {new Date(result.created_at).toLocaleDateString("af-ZA")}
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded text-sm font-medium ${
                        result.score >= 70 ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700"
                      }`}>
                        {result.score}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    );
  }

  // Learner List View
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold">Alle Leerders</h2>
      <p className="text-text-secondary text-sm">Klik op 'n leerder om hul volledige profiel, vordering en boodskappe te sien.</p>
      {learners.length === 0 ? (
        <Card><p className="text-text-muted">Geen leerders geregistreer nie</p></Card>
      ) : (
        learners.map(l => (
          <Card 
            key={l.learner.id} 
            testId={`learner-${l.learner.id}`}
            onClick={() => handleSelectLearner(l)}
            className="cursor-pointer hover:border-primary-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{l.learner.name} {l.learner.surname}</h3>
                <p className="text-sm text-text-muted">
                  Graad {l.learner.current_reading_level || l.learner.grade} | 
                  {l.exercises_completed} oefeninge | 
                  {l.average_score}% gemiddeld
                  {l.learner.school_name && ` | ${l.learner.school_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  l.subscription?.active 
                    ? "bg-primary-100 text-primary-700" 
                    : "bg-slate-100 text-text-muted"
                }`}>
                  {l.subscription?.type === "trial" && "Proef"}
                  {l.subscription?.type === "monthly" && "Maandeliks"}
                  {l.subscription?.type === "lifetime" && "Lewenslank"}
                  {!l.subscription?.active && "Onaktief"}
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [learners, setLearners] = useState([]);
  const [texts, setTexts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [schools, setSchools] = useState([]);
  const [schoolCodes, setSchoolCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newText, setNewText] = useState({ title: "", content: "", grade_level: 1, text_type: "comprehension" });
  const [generateForm, setGenerateForm] = useState({ grade_level: 1, text_type: "comprehension", topic: "" });
  const [inviteNote, setInviteNote] = useState("");
  const [schoolCodeForm, setSchoolCodeForm] = useState({ school_id: "", max_uses: 100, note: "" });
  const [newSchoolForm, setNewSchoolForm] = useState({ school_name: "", contact_person: "", contact_email: "", contact_whatsapp: "", max_learners: 100 });
  const [siteSettings, setSiteSettings] = useState({ logo_url: null, about_title: "Lees is Duidelik", about_text: "", contact_email: "", contact_phone: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [bankDetails, setBankDetails] = useState({
    bank_name: "FNB (First National Bank)",
    account_holder: "Lees is Duidelik",
    account_number: "62123456789",
    branch_code: "250655",
    account_type: "Tjek/Cheque",
    reference_instructions: "Gebruik jou gebruikersnaam as verwysing"
  });
  const logoInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/progress/all"),
      api.get("/texts"),
      api.get("/invitations"),
      api.get("/schools").catch(() => ({ data: [] })),
      api.get("/school-codes").catch(() => ({ data: [] })),
      api.get("/settings").catch(() => ({ data: {} })),
      api.get("/payments/eft/pending").catch(() => ({ data: { payments: [] } })),
      api.get("/payments/eft/all").catch(() => ({ data: { payments: [] } })),
      api.get("/payments/bank-details").catch(() => ({ data: bankDetails }))
    ])
    .then(([learnersRes, textsRes, invitesRes, schoolsRes, schoolCodesRes, settingsRes, pendingRes, allPaymentsRes, bankRes]) => {
      setLearners(learnersRes.data);
      setTexts(textsRes.data);
      setInvitations(invitesRes.data);
      setSchools(schoolsRes.data);
      setSchoolCodes(schoolCodesRes.data);
      if (settingsRes.data) setSiteSettings(prev => ({ ...prev, ...settingsRes.data }));
      setPendingPayments(pendingRes.data.payments || []);
      setAllPayments(allPaymentsRes.data.payments || []);
      if (bankRes.data) setBankDetails(prev => ({ ...prev, ...bankRes.data }));
    })
    .catch(err => {
      console.error("Error loading admin data:", err);
      toast.error("Kon nie data laai nie. Probeer weer.");
    })
    .finally(() => setLoading(false));
  }, []);

  const handleCreateText = async () => {
    try {
      await api.post("/texts", newText);
      toast.success("Teks geskep!");
      const res = await api.get("/texts");
      setTexts(res.data);
      setNewText({ title: "", content: "", grade_level: 1, text_type: "comprehension" });
    } catch (err) {
      toast.error("Kon nie teks skep nie");
    }
  };

  const handleGenerateText = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/texts/generate", generateForm);
      toast.success("Teks gegenereer!");
      const textsRes = await api.get("/texts");
      setTexts(textsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie genereer nie");
    }
    setGenerating(false);
  };

  const handleDeleteText = async (id) => {
    try {
      await api.delete(`/texts/${id}`);
      setTexts(texts.filter(t => t.id !== id));
      toast.success("Teks verwyder");
    } catch (err) {
      toast.error("Kon nie verwyder nie");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put("/settings", siteSettings);
      toast.success("Instellings gestoor!");
    } catch (err) {
      toast.error("Kon nie instellings stoor nie");
    }
    setSavingSettings(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await api.post("/settings/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSiteSettings(prev => ({ ...prev, logo_url: res.data.logo_url }));
      toast.success("Logo opgelaai!");
    } catch (err) {
      toast.error("Kon nie logo oplaai nie");
    }
  };

  const handleGenerateInvitation = async () => {
    try {
      const res = await api.post("/invitations/generate", { note: inviteNote });
      toast.success(`Kode geskep: ${res.data.code}`);
      setInviteNote("");
      const invitesRes = await api.get("/invitations");
      setInvitations(invitesRes.data);
    } catch (err) {
      toast.error("Kon nie kode skep nie");
    }
  };

  const handleDeleteInvitation = async (code) => {
    try {
      await api.delete(`/invitations/${code}`);
      setInvitations(invitations.filter(i => i.code !== code));
      toast.success("Kode verwyder");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Kon nie verwyder nie");
    }
  };

  const copyInviteLink = (code) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Skakel gekopieer!");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laai...</div>;
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
            <button onClick={onLogout} className="p-2 text-text-muted hover:text-accent-500" data-testid="admin-logout">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: "overview", icon: Home, label: "Oorsig" },
                { id: "payments", icon: CreditCard, label: "EFT Betalings" },
                { id: "schools", icon: Building2, label: "Skole" },
                { id: "invitations", icon: User, label: "Uitnodigings" },
                { id: "learners", icon: Users, label: "Leerders" },
                { id: "texts", icon: FileText, label: "Tekste" },
                { id: "generate", icon: Star, label: "Genereer" },
                { id: "settings", icon: Settings, label: "Instellings" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id 
                      ? "border-primary-500 text-primary-500" 
                      : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid md:grid-cols-4 gap-6">
              <Card testId="total-learners-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{learners.length}</div>
                    <div className="text-text-muted">Totale Leerders</div>
                  </div>
                </div>
              </Card>
              <Card testId="total-texts-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{texts.length}</div>
                    <div className="text-text-muted">Totale Tekste</div>
                  </div>
                </div>
              </Card>
              <Card testId="invitations-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{invitations.filter(i => !i.used).length}</div>
                    <div className="text-text-muted">Oop Uitnodigings</div>
                  </div>
                </div>
              </Card>
              <Card testId="active-subs-card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {learners.filter(l => l.subscription?.active).length}
                    </div>
                    <div className="text-text-muted">Aktiewe Subskripsies</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* EFT Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              {/* Pending Payments Alert */}
              {pendingPayments.length > 0 && (
                <Card className="border-yellow-500 bg-yellow-50" testId="pending-payments-alert">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-bold text-yellow-800">{pendingPayments.length} Waggende Betalings</p>
                      <p className="text-sm text-yellow-700">Betalings wat bevestiging benodig</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Bank Details Management */}
              <Card testId="bank-details-admin">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Bankbesonderhede (vir Leerders om te sien)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Bank Naam"
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                    testId="bank-name-input"
                  />
                  <Input
                    label="Rekeninghouer"
                    value={bankDetails.account_holder}
                    onChange={(e) => setBankDetails({...bankDetails, account_holder: e.target.value})}
                    testId="account-holder-input"
                  />
                  <Input
                    label="Rekeningnommer"
                    value={bankDetails.account_number}
                    onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
                    testId="account-number-input"
                  />
                  <Input
                    label="Takkode"
                    value={bankDetails.branch_code}
                    onChange={(e) => setBankDetails({...bankDetails, branch_code: e.target.value})}
                    testId="branch-code-input"
                  />
                  <Input
                    label="Tipe Rekening"
                    value={bankDetails.account_type}
                    onChange={(e) => setBankDetails({...bankDetails, account_type: e.target.value})}
                    testId="account-type-input"
                  />
                  <Input
                    label="Verwysing Instruksies"
                    value={bankDetails.reference_instructions}
                    onChange={(e) => setBankDetails({...bankDetails, reference_instructions: e.target.value})}
                    testId="reference-instructions-input"
                  />
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      await api.put("/payments/bank-details", bankDetails);
                      toast.success("Bankbesonderhede opgedateer!");
                    } catch (err) {
                      toast.error("Kon nie opdateer nie");
                    }
                  }}
                  className="mt-4"
                  testId="save-bank-details"
                >
                  Stoor Bankbesonderhede
                </Button>
              </Card>

              {/* Pending Payments */}
              <Card testId="pending-payments-list">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-yellow-600" />
                  Waggende Betalings ({pendingPayments.length})
                </h3>
                {pendingPayments.length === 0 ? (
                  <p className="text-text-muted text-center py-8">Geen waggende betalings nie</p>
                ) : (
                  <div className="space-y-3">
                    {pendingPayments.map((payment) => (
                      <div key={payment.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="font-bold">{payment.user_name || "Onbekend"}</p>
                            <p className="text-sm text-text-muted">Gebruikersnaam: {payment.username}</p>
                            <p className="text-sm">Pakket: <strong>{payment.package_name}</strong></p>
                            <p className="text-sm">Bedrag betaal: <strong>R{payment.amount_paid}</strong> (Verwag: R{payment.expected_amount})</p>
                            <p className="text-sm">Verwysing: <strong>{payment.reference_used}</strong></p>
                            <p className="text-sm">Datum: {payment.payment_date}</p>
                            {payment.proof_description && (
                              <p className="text-sm text-text-muted mt-1">Nota: {payment.proof_description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                try {
                                  await api.post("/payments/eft/confirm", { payment_id: payment.id, confirmed: true });
                                  toast.success("Betaling bevestig!");
                                  const [pendingRes, allRes] = await Promise.all([
                                    api.get("/payments/eft/pending"),
                                    api.get("/payments/eft/all")
                                  ]);
                                  setPendingPayments(pendingRes.data.payments || []);
                                  setAllPayments(allRes.data.payments || []);
                                } catch (err) {
                                  toast.error("Kon nie bevestig nie");
                                }
                              }}
                              className="bg-green-500 hover:bg-green-600"
                              testId={`confirm-payment-${payment.id}`}
                            >
                              <Check className="w-4 h-4 mr-1" /> Bevestig
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                const reason = prompt("Rede vir afkeur (opsioneel):");
                                try {
                                  await api.post("/payments/eft/confirm", { 
                                    payment_id: payment.id, 
                                    confirmed: false,
                                    admin_notes: reason 
                                  });
                                  toast.success("Betaling afgekeur");
                                  const [pendingRes, allRes] = await Promise.all([
                                    api.get("/payments/eft/pending"),
                                    api.get("/payments/eft/all")
                                  ]);
                                  setPendingPayments(pendingRes.data.payments || []);
                                  setAllPayments(allRes.data.payments || []);
                                } catch (err) {
                                  toast.error("Kon nie afkeur nie");
                                }
                              }}
                              className="!text-red-600 !border-red-300"
                              testId={`reject-payment-${payment.id}`}
                            >
                              <X className="w-4 h-4 mr-1" /> Keur Af
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* All Payments History */}
              <Card testId="all-payments-list">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                  <FileBarChart className="w-5 h-5" />
                  Alle Betalings ({allPayments.length})
                </h3>
                {allPayments.length === 0 ? (
                  <p className="text-text-muted text-center py-8">Geen betalings nog nie</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Leerder</th>
                          <th className="text-left py-2 px-2">Pakket</th>
                          <th className="text-left py-2 px-2">Bedrag</th>
                          <th className="text-left py-2 px-2">Verwysing</th>
                          <th className="text-left py-2 px-2">Datum</th>
                          <th className="text-left py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPayments.slice(0, 50).map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-slate-50">
                            <td className="py-2 px-2">
                              <div className="font-medium">{payment.user_name}</div>
                              <div className="text-xs text-text-muted">{payment.username}</div>
                            </td>
                            <td className="py-2 px-2">{payment.package_id === "once_off" ? "Eenmalig" : "Maandeliks"}</td>
                            <td className="py-2 px-2">R{payment.amount_paid}</td>
                            <td className="py-2 px-2 font-mono text-xs">{payment.reference_used}</td>
                            <td className="py-2 px-2">{new Date(payment.created_at).toLocaleDateString("af-ZA")}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                payment.payment_status === "paid" ? "bg-green-100 text-green-700" :
                                payment.payment_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {payment.payment_status === "paid" ? "Bevestig" : 
                                 payment.payment_status === "pending" ? "Wag" : "Afgekeur"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Schools Tab */}
          {activeTab === "schools" && (
            <div className="space-y-6">
              <Card testId="schools-info">
                <h3 className="font-heading font-bold mb-4">Skole Bestuur</h3>
                <p className="text-text-secondary mb-4">
                  Hier kan jy skool registrasies sien en skoolkodes skep wat veelvuldige leerders kan gebruik om te registreer.
                </p>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm"><strong>Gelyktydige Toegang:</strong> Die platform kan honderde leerders gelyktydig hanteer. Elke skool kry 'n unieke kode wat hul leerders kan deel.</p>
                </div>
              </Card>

              {/* Manual School Creation */}
              <Card testId="add-school-manually">
                <h3 className="font-heading font-bold mb-4">Voeg Skool By & Genereer Kode</h3>
                <p className="text-sm text-text-muted mb-4">
                  Voeg 'n nuwe skool by en genereer outomaties 'n permanente skoolkode wat leerders kan gebruik om te registreer.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Skool Naam"
                    value={newSchoolForm?.school_name || ""}
                    onChange={(e) => setNewSchoolForm({...newSchoolForm, school_name: e.target.value})}
                    placeholder="bv. Laerskool Pretoria-Oos"
                    testId="new-school-name"
                  />
                  <Input
                    label="Kontak Persoon"
                    value={newSchoolForm?.contact_person || ""}
                    onChange={(e) => setNewSchoolForm({...newSchoolForm, contact_person: e.target.value})}
                    placeholder="bv. Mnr. Van der Merwe"
                    testId="new-school-contact"
                  />
                  <Input
                    label="Kontak E-pos"
                    type="email"
                    value={newSchoolForm?.contact_email || ""}
                    onChange={(e) => setNewSchoolForm({...newSchoolForm, contact_email: e.target.value})}
                    placeholder="bv. admin@skool.co.za"
                    testId="new-school-email"
                  />
                  <Input
                    label="Kontak WhatsApp"
                    value={newSchoolForm?.contact_whatsapp || ""}
                    onChange={(e) => setNewSchoolForm({...newSchoolForm, contact_whatsapp: e.target.value})}
                    placeholder="bv. 0821234567"
                    testId="new-school-whatsapp"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-2">Maksimum Leerders</label>
                    <select
                      className="input-field"
                      value={newSchoolForm?.max_learners || 100}
                      onChange={(e) => setNewSchoolForm({...newSchoolForm, max_learners: parseInt(e.target.value)})}
                      data-testid="new-school-max-learners"
                    >
                      <option value={50}>50 leerders</option>
                      <option value={100}>100 leerders</option>
                      <option value={200}>200 leerders</option>
                      <option value={500}>500 leerders</option>
                      <option value={1000}>1000+ leerders</option>
                    </select>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    if (!newSchoolForm?.school_name) {
                      toast.error("Voer die skool naam in");
                      return;
                    }
                    try {
                      const res = await api.post("/schools/create-with-code", newSchoolForm);
                      toast.success(`Skool bygevoeg! Kode: ${res.data.school_code}`);
                      setNewSchoolForm({ school_name: "", contact_person: "", contact_email: "", contact_whatsapp: "", max_learners: 100 });
                      // Refresh schools and codes
                      const schoolsRes = await api.get("/schools");
                      setSchools(schoolsRes.data);
                      const codesRes = await api.get("/school-codes");
                      setSchoolCodes(codesRes.data);
                    } catch (err) {
                      toast.error(err.response?.data?.detail || "Kon nie skool byvoeg nie");
                    }
                  }}
                  className="mt-4 w-full"
                  testId="create-school-btn"
                >
                  Skep Skool & Genereer Kode
                </Button>
              </Card>

              {/* Active School Codes */}
              <h3 className="font-heading font-bold">Aktiewe Skoolkodes</h3>
              <div className="space-y-3">
                {schoolCodes.length === 0 ? (
                  <Card><p className="text-text-muted">Geen skoolkodes geskep nie. Voeg 'n skool hierbo by om 'n kode te genereer.</p></Card>
                ) : (
                  schoolCodes.map(code => (
                    <Card key={code.code} testId={`school-code-${code.code}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary-100 text-primary-700 px-3 py-1 rounded-lg font-mono font-bold text-lg">
                              {code.code}
                            </div>
                            <span className="font-semibold">{code.school_name}</span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">
                            Gebruik: {code.uses_count || 0} / {code.max_uses} leerders
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/register?code=${code.code}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Registrasie skakel gekopieer!");
                            }}
                            className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
                            title="Kopieer skakel"
                            data-testid={`copy-school-code-${code.code}`}
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(code.code);
                              toast.success(`Kode gekopieer: ${code.code}`);
                            }}
                            className="px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100"
                            data-testid={`copy-code-only-${code.code}`}
                          >
                            Kopieer Kode
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* School Code Generator for existing schools without codes */}
              {schools.filter(s => s.status === "approved" && !s.school_code).length > 0 && (
                <Card testId="generate-school-code-form">
                  <h3 className="font-heading font-bold mb-4">Skep Skoolkode</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-text-secondary mb-2">Kies Skool</label>
                      <select
                        className="input-field"
                        value={schoolCodeForm.school_id}
                        onChange={(e) => setSchoolCodeForm({...schoolCodeForm, school_id: e.target.value})}
                        data-testid="school-select"
                      >
                        <option value="">Kies 'n skool...</option>
                        {schools.filter(s => s.status === "pending" || !s.school_code).map(s => (
                          <option key={s.id} value={s.id}>{s.school_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-text-secondary mb-2">Maksimum Leerders</label>
                      <select
                        className="input-field"
                        value={schoolCodeForm.max_uses}
                        onChange={(e) => setSchoolCodeForm({...schoolCodeForm, max_uses: parseInt(e.target.value)})}
                        data-testid="max-uses-select"
                      >
                        <option value={50}>50 leerders</option>
                        <option value={100}>100 leerders</option>
                        <option value={200}>200 leerders</option>
                        <option value={500}>500 leerders</option>
                        <option value={1000}>1000 leerders</option>
                      </select>
                    </div>
                  </div>
                  <Button 
                    onClick={async () => {
                      if (!schoolCodeForm.school_id) {
                        toast.error("Kies eers 'n skool");
                        return;
                      }
                      try {
                        const res = await api.post(`/schools/${schoolCodeForm.school_id}/generate-code`, schoolCodeForm);
                        toast.success(`Skoolkode geskep: ${res.data.code}`);
                        const [schoolsRes, codesRes] = await Promise.all([api.get("/schools"), api.get("/school-codes")]);
                        setSchools(schoolsRes.data);
                        setSchoolCodes(codesRes.data);
                      } catch (err) {
                        toast.error("Kon nie kode skep nie");
                      }
                    }}
                    className="mt-2" 
                    testId="generate-school-code-btn"
                  >
                    Skep Skoolkode
                  </Button>
                </Card>
              )}

              {/* Pending School Registrations */}
              <h3 className="font-heading font-bold mt-8">Skool Registrasies</h3>
              <div className="space-y-4">
                {schools.length === 0 ? (
                  <Card><p className="text-text-muted">Geen skool registrasies ontvang nie</p></Card>
                ) : (
                  schools.map(school => (
                    <Card key={school.id} testId={`school-${school.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-primary-500" />
                            <h4 className="font-semibold">{school.school_name}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              school.status === "approved" ? "bg-primary-100 text-primary-700" :
                              school.status === "rejected" ? "bg-accent-100 text-accent-700" :
                              "bg-secondary-100 text-secondary-700"
                            }`}>
                              {school.status === "approved" ? "Goedgekeur" : school.status === "rejected" ? "Afgekeur" : "Hangende"}
                            </span>
                            {school.payment_status === "paid" && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                Betaal
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-text-secondary grid grid-cols-2 gap-2">
                            <p><strong>Kontak:</strong> {school.contact_person}</p>
                            <p><strong>E-pos:</strong> {school.contact_email}</p>
                            <p><strong>WhatsApp:</strong> {school.contact_whatsapp}</p>
                            <p><strong>Leerders:</strong> {school.learner_count}+</p>
                            {school.principal_contact && <p><strong>Hoof:</strong> {school.principal_contact}</p>}
                            {school.school_code && <p><strong>Kode:</strong> {school.school_code}</p>}
                          </div>
                          
                          {/* Package Settings with Per-Learner Calculator */}
                          {school.status === "approved" && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="w-4 h-4 text-primary-500" />
                                <span className="font-semibold text-sm">Pakket Instellings & Sakrekenaar</span>
                              </div>
                              
                              {/* Per Learner Calculator */}
                              <div className="bg-primary-50 rounded-xl p-4 mb-4">
                                <p className="text-sm font-semibold text-primary-700 mb-3">Per Leerder Sakrekenaar</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-xs text-text-muted mb-1">Aantal Leerders</label>
                                    <input
                                      type="number"
                                      className="input-field !py-2"
                                      defaultValue={school.learner_count || 100}
                                      id={`learner-count-${school.id}`}
                                      onChange={(e) => {
                                        const count = parseInt(e.target.value) || 0;
                                        const monthlyRate = parseFloat(document.getElementById(`monthly-rate-${school.id}`)?.value) || 10;
                                        const onceOffRate = parseFloat(document.getElementById(`once-off-rate-${school.id}`)?.value) || 50;
                                        document.getElementById(`monthly-total-${school.id}`).textContent = `R${(count * monthlyRate).toLocaleString()}`;
                                        document.getElementById(`once-off-total-${school.id}`).textContent = `R${(count * onceOffRate).toLocaleString()}`;
                                      }}
                                      data-testid={`learner-count-${school.id}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-text-muted mb-1">Maandeliks per Leerder</label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-text-muted">R</span>
                                      <input
                                        type="number"
                                        className="input-field !py-2"
                                        defaultValue={school.monthly_per_learner || 10}
                                        id={`monthly-rate-${school.id}`}
                                        onChange={(e) => {
                                          const rate = parseFloat(e.target.value) || 0;
                                          const count = parseInt(document.getElementById(`learner-count-${school.id}`)?.value) || 0;
                                          document.getElementById(`monthly-total-${school.id}`).textContent = `R${(count * rate).toLocaleString()}`;
                                        }}
                                        data-testid={`monthly-rate-${school.id}`}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-text-muted mb-1">Eenmalig per Leerder</label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-text-muted">R</span>
                                      <input
                                        type="number"
                                        className="input-field !py-2"
                                        defaultValue={school.once_off_per_learner || 50}
                                        id={`once-off-rate-${school.id}`}
                                        onChange={(e) => {
                                          const rate = parseFloat(e.target.value) || 0;
                                          const count = parseInt(document.getElementById(`learner-count-${school.id}`)?.value) || 0;
                                          document.getElementById(`once-off-total-${school.id}`).textContent = `R${(count * rate).toLocaleString()}`;
                                        }}
                                        data-testid={`once-off-rate-${school.id}`}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col justify-end">
                                    <label className="block text-xs text-text-muted mb-1">Bereken Totaal</label>
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between bg-white rounded px-2 py-1">
                                        <span>Maandeliks:</span>
                                        <span className="font-bold text-primary-600" id={`monthly-total-${school.id}`}>
                                          R{((school.learner_count || 100) * (school.monthly_per_learner || 10)).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between bg-white rounded px-2 py-1">
                                        <span>Eenmalig:</span>
                                        <span className="font-bold text-secondary-600" id={`once-off-total-${school.id}`}>
                                          R{((school.learner_count || 100) * (school.once_off_per_learner || 50)).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Final Price & Billing */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <label className="block text-xs text-text-muted mb-1">Finale Maandelikse Prys</label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-text-muted">R</span>
                                    <input
                                      type="number"
                                      className="input-field !py-1 !px-2 w-24"
                                      defaultValue={school.monthly_price || ((school.learner_count || 100) * 10)}
                                      onChange={(e) => {
                                        const price = parseFloat(e.target.value);
                                        api.put(`/schools/${school.id}/package`, {
                                          package_type: "standard",
                                          monthly_price: price,
                                          once_off_price: school.once_off_price || 399
                                        }).catch(console.error);
                                      }}
                                      data-testid={`school-monthly-price-${school.id}`}
                                    />
                                  </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <label className="block text-xs text-text-muted mb-1">Finale Eenmalige Prys</label>
                                  <div className="flex items-center gap-1">
                                    <span className="text-text-muted">R</span>
                                    <input
                                      type="number"
                                      className="input-field !py-1 !px-2 w-24"
                                      defaultValue={school.once_off_price || ((school.learner_count || 100) * 50)}
                                      onChange={(e) => {
                                        const price = parseFloat(e.target.value);
                                        api.put(`/schools/${school.id}/package`, {
                                          package_type: "standard",
                                          monthly_price: school.monthly_price || 100,
                                          once_off_price: price
                                        }).catch(console.error);
                                      }}
                                      data-testid={`school-once-off-price-${school.id}`}
                                    />
                                  </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                  <label className="block text-xs text-text-muted mb-1">Fakturering</label>
                                  <select
                                    className="input-field !py-1 !px-2"
                                    defaultValue={school.billing_cycle || "monthly"}
                                    onChange={(e) => {
                                      api.put(`/schools/${school.id}/package`, {
                                        package_type: "standard",
                                        monthly_price: school.monthly_price || 100,
                                        once_off_price: school.once_off_price || 399,
                                        billing_cycle: e.target.value
                                      }).catch(console.error);
                                    }}
                                    data-testid={`school-billing-cycle-${school.id}`}
                                  >
                                    <option value="monthly">Maandeliks</option>
                                    <option value="once_off">Eenmalig</option>
                                  </select>
                                </div>
                                <div className="flex items-end">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.post(`/schools/${school.id}/confirm-payment`);
                                        toast.success("Betaling bevestig! Leerders kan nou aanhou.");
                                        const res = await api.get("/schools");
                                        setSchools(res.data);
                                      } catch (err) {
                                        toast.error("Kon nie betaling bevestig nie");
                                      }
                                    }}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                      school.payment_status === "paid"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-primary-500 text-white hover:bg-primary-600"
                                    }`}
                                    data-testid={`confirm-payment-${school.id}`}
                                  >
                                    <DollarSign className="w-4 h-4" />
                                    {school.payment_status === "paid" ? "Betaal ✓" : "Bevestig Betaling"}
                                  </button>
                                </div>
                              </div>
                              {school.payment_valid_until && (
                                <p className="text-xs text-text-muted mt-2">
                                  Geldig tot: {new Date(school.payment_valid_until).toLocaleDateString("af-ZA")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === "invitations" && (
            <div className="space-y-6">
              <Card testId="generate-invite-form">
                <h3 className="font-heading font-bold mb-4">Skep Nuwe Uitnodigingskode</h3>
                <p className="text-text-secondary mb-4">
                  Skep 'n kode en stuur dit na ouers/leerders om te registreer.
                </p>
                <div className="flex gap-4">
                  <Input
                    label="Nota (opsioneel)"
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    placeholder="bv. Vir Johan se kind"
                    className="flex-1"
                    testId="invite-note-input"
                  />
                </div>
                <Button onClick={handleGenerateInvitation} className="mt-4" testId="generate-invite-btn">
                  Skep Uitnodigingskode
                </Button>
              </Card>

              <h3 className="font-heading font-bold">Alle Uitnodigingskodes</h3>
              <div className="space-y-4">
                {invitations.length === 0 ? (
                  <Card><p className="text-text-muted">Geen uitnodigingskodes geskep nie</p></Card>
                ) : (
                  invitations.map(inv => (
                    <Card key={inv.code} testId={`invite-${inv.code}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold bg-slate-100 px-3 py-1 rounded">{inv.code}</span>
                            {inv.used ? (
                              <span className="text-xs bg-slate-200 text-text-muted px-2 py-1 rounded-full">Gebruik</span>
                            ) : (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">Beskikbaar</span>
                            )}
                          </div>
                          {inv.note && <p className="text-sm text-text-muted mt-1">{inv.note}</p>}
                          {inv.used && inv.used_by && (
                            <p className="text-sm text-text-muted mt-1">Gebruik deur leerder</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!inv.used && (
                            <>
                              <button
                                onClick={() => copyInviteLink(inv.code)}
                                className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
                                title="Kopieer skakel"
                                data-testid={`copy-invite-${inv.code}`}
                              >
                                <Copy className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteInvitation(inv.code)}
                                className="p-2 text-accent-500 hover:bg-accent-50 rounded-lg"
                                data-testid={`delete-invite-${inv.code}`}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Learners Tab */}
          {activeTab === "learners" && (
            <LearnersTab learners={learners} setLearners={setLearners} />
          )}

          {/* Texts Tab */}
          {activeTab === "texts" && (
            <TextsTab texts={texts} setTexts={setTexts} />
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <Card testId="generate-form">
              <h3 className="font-heading font-bold mb-4">Genereer Teks met AI</h3>
              <p className="text-text-secondary mb-6">
                Gebruik KI om outomaties Afrikaanse leesmateriaal te skep vir verskillende vlakke.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Graad</label>
                  <select
                    className="input-field"
                    value={generateForm.grade_level}
                    onChange={(e) => setGenerateForm({...generateForm, grade_level: parseInt(e.target.value)})}
                    data-testid="generate-grade-select"
                  >
                    {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>Graad {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Tipe</label>
                  <select
                    className="input-field"
                    value={generateForm.text_type}
                    onChange={(e) => setGenerateForm({...generateForm, text_type: e.target.value})}
                    data-testid="generate-type-select"
                  >
                    <option value="comprehension">Begrip</option>
                    <option value="reading">Lees</option>
                    <option value="spelling">Spelling</option>
                  </select>
                </div>
                <Input
                  label="Onderwerp (opsioneel)"
                  value={generateForm.topic}
                  onChange={(e) => setGenerateForm({...generateForm, topic: e.target.value})}
                  placeholder="bv. Diere, Sport, Familie"
                  testId="generate-topic-input"
                />
              </div>
              <Button 
                onClick={handleGenerateText} 
                disabled={generating} 
                className="mt-6"
                testId="generate-text-btn"
              >
                {generating ? "Genereer..." : "Genereer Teks"}
              </Button>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <Card testId="settings-logo">
                <h3 className="font-heading font-bold mb-4">Logo</h3>
                <p className="text-text-secondary mb-4">
                  Laai jou logo op wat op die tuisblad vertoon sal word.
                </p>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
                    {siteSettings.logo_url ? (
                      <img 
                        src={`${BACKEND_URL}${siteSettings.logo_url}`} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button 
                      onClick={() => logoInputRef.current?.click()}
                      variant="secondary"
                      testId="upload-logo-btn"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {siteSettings.logo_url ? "Vervang Logo" : "Laai Logo Op"}
                    </Button>
                    <p className="text-sm text-text-muted mt-2">PNG, JPG of SVG. Maksimum 2MB.</p>
                  </div>
                </div>
              </Card>

              <Card testId="settings-about">
                <h3 className="font-heading font-bold mb-4">Oor Ons</h3>
                <p className="text-text-secondary mb-4">
                  Vertel besoekers meer oor jouself en jou platform.
                </p>
                <Input
                  label="Titel"
                  value={siteSettings.about_title}
                  onChange={(e) => setSiteSettings({...siteSettings, about_title: e.target.value})}
                  placeholder="bv. Lees is Duidelik"
                  testId="settings-about-title"
                />
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">Oor Ons Teks</label>
                  <textarea
                    className="input-field min-h-[150px]"
                    value={siteSettings.about_text}
                    onChange={(e) => setSiteSettings({...siteSettings, about_text: e.target.value})}
                    placeholder="Skryf hier oor jouself, jou missie, en wat jou platform bied..."
                    data-testid="settings-about-text"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Kontak E-pos"
                    type="email"
                    value={siteSettings.contact_email}
                    onChange={(e) => setSiteSettings({...siteSettings, contact_email: e.target.value})}
                    placeholder="bv. info@leesisduidelik.co.za"
                    testId="settings-contact-email"
                  />
                  <Input
                    label="Kontak Telefoon"
                    value={siteSettings.contact_phone}
                    onChange={(e) => setSiteSettings({...siteSettings, contact_phone: e.target.value})}
                    placeholder="bv. 012 345 6789"
                    testId="settings-contact-phone"
                  />
                </div>
              </Card>

              <Button 
                onClick={handleSaveSettings} 
                disabled={savingSettings}
                className="w-full md:w-auto"
                testId="save-settings-btn"
              >
                {savingSettings ? "Stoor..." : "Stoor Instellings"}
              </Button>

              {/* Admin Password Change */}
              <Card className="mt-6" testId="password-change-card">
                <h3 className="font-heading font-bold mb-4">🔐 Verander Admin Wagwoord</h3>
                <div className="space-y-4">
                  <Input
                    label="Huidige Wagwoord"
                    type="password"
                    value={passwordForm?.current || ""}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                    testId="current-password-input"
                  />
                  <Input
                    label="Nuwe Wagwoord"
                    type="password"
                    value={passwordForm?.new || ""}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                    testId="new-password-input"
                  />
                  <Input
                    label="Bevestig Nuwe Wagwoord"
                    type="password"
                    value={passwordForm?.confirm || ""}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    testId="confirm-password-input"
                  />
                  <Button 
                    onClick={async () => {
                      if (!passwordForm?.current || !passwordForm?.new || !passwordForm?.confirm) {
                        toast.error("Vul al die velde in");
                        return;
                      }
                      if (passwordForm.new !== passwordForm.confirm) {
                        toast.error("Nuwe wagwoorde stem nie ooreen nie");
                        return;
                      }
                      if (passwordForm.new.length < 6) {
                        toast.error("Wagwoord moet ten minste 6 karakters wees");
                        return;
                      }
                      try {
                        const res = await api.post("/auth/admin/change-password", {
                          current_password: passwordForm.current,
                          new_password: passwordForm.new
                        });
                        toast.success(res.data.message);
                        setPasswordForm({ current: "", new: "", confirm: "" });
                      } catch (err) {
                        toast.error(err.response?.data?.detail || "Kon nie wagwoord verander nie");
                      }
                    }}
                    variant="secondary"
                    testId="change-password-btn"
                  >
                    Verander Wagwoord
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Payment Success/Cancel Pages
const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-4">Betaling Suksesvol!</h1>
          <p className="text-text-secondary mb-6">Dankie vir jou ondersteuning. Jy kan nou al die oefeninge geniet!</p>
          <Button onClick={() => navigate("/dashboard")} className="w-full" testId="go-to-dashboard-success">
            Gaan na Dashboard
          </Button>
        </Card>
      </div>
    </PageTransition>
  );
};

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-text-muted" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-4">Betaling Gekanselleer</h1>
          <p className="text-text-secondary mb-6">Geen probleem! Jy kan enige tyd weer probeer.</p>
          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => navigate("/dashboard")} className="flex-1" testId="back-to-dashboard">
              Terug
            </Button>
            <Button onClick={() => navigate("/subscription")} className="flex-1" testId="try-again">
              Probeer Weer
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};

// Parent Portal
const ParentPortal = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [childData, setChildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpStep, setOtpStep] = useState("phone"); // phone, otp, verified
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState(null);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    loadChildData();
    // Check for payment status
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Betaling suksesvol! Dankie!");
    }
  }, [token]);

  const loadChildData = async () => {
    try {
      const res = await axios.get(`${API}/parent/child-progress/${token}`);
      setChildData(res.data);
      if (res.data.link_verified) {
        setOtpStep("verified");
      }
    } catch (err) {
      setError("Ongeldige skakel. Kontak asseblief die admin.");
    }
    setLoading(false);
  };

  const requestOTP = async () => {
    if (!whatsappNumber || whatsappNumber.length < 10) {
      setError("Voer asseblief 'n geldige WhatsApp nommer in");
      return;
    }
    setError("");
    try {
      const res = await axios.post(`${API}/parent/request-otp`, {
        whatsapp_number: whatsappNumber,
        parent_token: token
      });
      setOtpMessage(res.data);
      setOtpStep("otp");
      toast.success("OTP gegenereer! Admin sal dit aan jou stuur.");
    } catch (err) {
      setError(err.response?.data?.detail || "Kon nie OTP genereer nie");
    }
  };

  const verifyOTP = async () => {
    setError("");
    try {
      const res = await axios.post(`${API}/parent/verify-otp`, {
        whatsapp_number: whatsappNumber,
        otp: otp,
        parent_token: token
      });
      toast.success("Welkom! Jy het nou toegang.");
      setOtpStep("verified");
      loadChildData();
    } catch (err) {
      setError(err.response?.data?.detail || "Ongeldige OTP");
    }
  };

  const handleCheckout = async (packageId) => {
    setCheckoutLoading(true);
    try {
      const res = await axios.post(`${API}/parent/checkout/${token}`, {
        package_id: packageId,
        origin_url: window.location.origin
      });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error("Kon nie betaling begin nie");
    }
    setCheckoutLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted">Laai...</p>
        </div>
      </div>
    );
  }

  if (error && !childData) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="text-center max-w-md">
            <div className="w-20 h-20 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-10 h-10 text-accent-500" />
            </div>
            <h1 className="font-heading text-2xl font-bold mb-4">Oeps!</h1>
            <p className="text-text-secondary">{error}</p>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white shadow-sm p-4">
          <div className="max-w-lg mx-auto">
            <h1 className="font-heading text-xl font-bold text-center text-primary-500">
              Lees is Duidelik
            </h1>
            <p className="text-center text-sm text-text-muted">Ouer Portaal</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* OTP Verification (if not verified) */}
          {otpStep !== "verified" && (
            <Card testId="otp-verification">
              <h2 className="font-heading text-lg font-bold mb-4">Verifieer Jou Toegang</h2>
              
              {otpStep === "phone" && (
                <>
                  <p className="text-text-secondary text-sm mb-4">
                    Voer jou WhatsApp nommer in om 'n eenmalige kode te ontvang.
                  </p>
                  <Input
                    label="WhatsApp Nommer"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="bv. 0821234567"
                    testId="parent-whatsapp-input"
                  />
                  {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
                  <Button onClick={requestOTP} className="w-full" testId="request-otp-btn">
                    Stuur OTP
                  </Button>
                </>
              )}

              {otpStep === "otp" && (
                <>
                  <div className="bg-primary-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-primary-700">
                      <strong>OTP Kode:</strong> {otpMessage?.otp}
                    </p>
                    <p className="text-xs text-primary-600 mt-1">
                      Die admin sal hierdie kode aan jou WhatsApp stuur.
                    </p>
                  </div>
                  <Input
                    label="Voer OTP Kode In"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-syfer kode"
                    testId="otp-input"
                  />
                  {error && <p className="text-accent-500 text-sm mb-4">{error}</p>}
                  <Button onClick={verifyOTP} className="w-full" testId="verify-otp-btn">
                    Verifieer
                  </Button>
                  <button 
                    onClick={() => setOtpStep("phone")} 
                    className="w-full text-center text-sm text-text-muted mt-3"
                  >
                    Terug
                  </button>
                </>
              )}
            </Card>
          )}

          {/* Child Info Card */}
          {childData && (
            <>
              <Card testId="child-info-card">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold">
                      {childData.learner.name} {childData.learner.surname}
                    </h2>
                    <p className="text-text-secondary">
                      Graad {childData.learner.grade} | 
                      Leesvlak: Graad {childData.learner.current_reading_level}
                    </p>
                    {childData.learner.school_name && (
                      <p className="text-sm text-text-muted">{childData.learner.school_name}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center">
                  <div className="text-3xl font-bold text-primary-500">{childData.stats.exercises_completed}</div>
                  <div className="text-xs text-text-muted">Oefeninge</div>
                </Card>
                <Card className="text-center">
                  <div className="text-3xl font-bold text-primary-500">{childData.stats.average_score}%</div>
                  <div className="text-xs text-text-muted">Gemiddeld</div>
                </Card>
                <Card className="text-center">
                  <div className="text-3xl font-bold text-primary-500">{childData.stats.reading_wpm}</div>
                  <div className="text-xs text-text-muted">WPM</div>
                </Card>
              </div>

              {/* Subscription Status */}
              <Card testId="subscription-card">
                <h3 className="font-heading font-bold mb-3">Subskripsie Status</h3>
                <div className={`p-4 rounded-xl ${childData.subscription?.active ? "bg-primary-50" : "bg-accent-50"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${childData.subscription?.active ? "text-primary-700" : "text-accent-700"}`}>
                        {childData.subscription?.active ? "Aktief" : "Onaktief"}
                      </p>
                      <p className="text-sm text-text-muted">
                        {childData.subscription?.type === "trial" && `Proeftydperk - ${childData.subscription?.days_left} dae oor`}
                        {childData.subscription?.type === "monthly" && "Maandelikse subskripsie"}
                        {childData.subscription?.type === "lifetime" && "Lewenslange toegang"}
                        {!childData.subscription?.active && "Subskripsie benodig"}
                      </p>
                    </div>
                    {childData.subscription?.active ? (
                      <Check className="w-8 h-8 text-primary-500" />
                    ) : (
                      <X className="w-8 h-8 text-accent-500" />
                    )}
                  </div>
                </div>

                {/* Payment Options */}
                {(!childData.subscription?.active || childData.subscription?.type === "trial") && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-text-secondary">Kies 'n plan om voort te gaan:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleCheckout("monthly")}
                        disabled={checkoutLoading}
                        className="p-4 border-2 border-slate-200 rounded-xl hover:border-primary-500 transition-colors"
                        data-testid="parent-checkout-monthly"
                      >
                        <div className="font-bold">R100/maand</div>
                        <div className="text-xs text-text-muted">Maandeliks</div>
                      </button>
                      <button
                        onClick={() => handleCheckout("lifetime")}
                        disabled={checkoutLoading}
                        className="p-4 border-2 border-primary-500 rounded-xl bg-primary-50"
                        data-testid="parent-checkout-lifetime"
                      >
                        <div className="font-bold text-primary-700">R399 eenmalig</div>
                        <div className="text-xs text-primary-600">Lewenslank</div>
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Recent Results */}
              <Card testId="recent-results">
                <h3 className="font-heading font-bold mb-3">Onlangse Resultate</h3>
                {childData.recent_results?.length === 0 ? (
                  <p className="text-text-muted text-sm">Geen resultate nog nie</p>
                ) : (
                  <div className="space-y-2">
                    {childData.recent_results?.map((result, idx) => (
                      <div key={result.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium text-sm capitalize">{result.exercise_type?.replace("_", " ")}</span>
                          <span className="text-xs text-text-muted ml-2">
                            {new Date(result.created_at).toLocaleDateString("af-ZA")}
                          </span>
                        </div>
                        <div className={`px-2 py-1 rounded text-sm font-medium ${
                          result.score >= 70 ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700"
                        }`}>
                          {result.score}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Protected Route
const ProtectedRoute = ({ children, user, loading, requiredType }) => {
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laai...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredType && user.user_type !== requiredType) {
    return <Navigate to={user.user_type === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  
  return children;
};

// Main App
function App() {
  const { user, loading, login, register, logout } = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.user_type === "admin" ? "/admin" : "/dashboard"} /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to={user.user_type === "admin" ? "/admin" : "/dashboard"} /> : <LoginPage onLogin={login} />} />
          <Route path="/register" element={user ? <Navigate to="/reading-test" /> : <RegisterPage onRegister={register} />} />
          
          <Route path="/reading-test" element={
            <ProtectedRoute user={user} loading={loading} requiredType="learner">
              <ReadingTestPage user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute user={user} loading={loading} requiredType="learner">
              <LearnerDashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          } />
          
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
          
          <Route path="/exercise/:type" element={
            <ProtectedRoute user={user} loading={loading} requiredType="learner">
              <ExercisePage user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/subscription" element={
            <ProtectedRoute user={user} loading={loading} requiredType="learner">
              <SubscriptionPage user={user} />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute user={user} loading={loading} requiredType="admin">
              <AdminDashboard onLogout={logout} />
            </ProtectedRoute>
          } />
          
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />
          
          <Route path="/parent/:token" element={<ParentPortal />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
