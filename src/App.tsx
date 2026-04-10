import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = { 
  apiKey: "AIzaSyDe6wm5SrWmNmDLj20CFrv3jx8g6JkQgyM",
  authDomain: "vetcare-mvp.firebaseapp.com",
  projectId: "vetcare-mvp",
  storageBucket: "vetcare-mvp.firebasestorage.app",
  messagingSenderId: "1002161594654",
  appId: "1:1002161594654:web:25bf86c57673a0bbe4290f",
};
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── CLOUD HELPERS ────────────────────────────────────────────────────────────
const cloud = {
  async save(uid, key, data) {
    const payload = key === "profile" ? data : { list: data };
    await setDoc(doc(db, "vets", uid, "data", key), payload, {
      merge: key === "profile",
    });
  },
  async loadAll(uid) {
    const [pro, pet, vis, vac, apt, inv] = await Promise.all([
      getDoc(doc(db, "vets", uid, "data", "profile")),
      getDoc(doc(db, "vets", uid, "data", "pets")),
      getDoc(doc(db, "vets", uid, "data", "visits")),
      getDoc(doc(db, "vets", uid, "data", "vaccines")),
      getDoc(doc(db, "vets", uid, "data", "appointments")),
      getDoc(doc(db, "vets", uid, "data", "inventory")),
    ]);
    const list = (s) => (s.exists() ? s.data().list || [] : []);
    return {
      profile: pro.exists() ? pro.data() : null,
      pets: list(pet),
      visits: list(vis),
      vaccines: list(vac),
      appointments: list(apt),
      inventory: list(inv),
    };
  },
};
async function sendRegistrationEmail(name, clinic, email) {
  try {
    const formData = new FormData();
    formData.append("access_key", "b6706da0-295d-4ad1-a5c4-7cbfbb861ede");
    formData.append(
      "subject",
      "🐾 Nueva veterinaria registrada en VetCare MVP"
    );
    formData.append("from_name", "VetCare MVP");
    formData.append("name", name);
    formData.append("email", email);
    formData.append(
      "message",
      `Nueva veterinaria registrada:\n\nNombre: ${name}\nClínica: ${clinic}\nCorreo: ${email}\nFecha: ${new Date().toLocaleString(
        "es-ES"
      )}`
    );

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ Notificación enviada a tu correo");
    } else {
      console.warn("⚠️ Web3Forms error:", data);
    }
  } catch (e) {
    console.error("Error Web3Forms:", e);
  }
}
function exportData(profile, pets, visits, vaccines, appointments, inventory) {
  const obj = {
    _meta: {
      exportDate: new Date().toISOString(),
      vetcareVersion: "MVP-2.1",
      migracionKey: profile?.email,
    },
    profile,
    pets,
    visits,
    vaccines,
    appointments,
    inventory,
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })
  );
  a.download = `vetcare_${profile?.email?.replace(/@/g, "_at_")}_${
    new Date().toISOString().split("T")[0]
  }.json`;
  a.click();
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_PETS = [
  {
    id: "p1",
    name: "Luna",
    owner: "María García",
    phone: "987654321",
    email: "maria@mail.com",
    species: "Felino",
    breed: "Persa",
    coatColor: "Blanco",
    age: "3 años",
    dob: "2022-01-01",
    weight: "4.2kg",
    status: "Activo",
    lastVisit: "2026-02-15",
    avatar: "🐱",
    color: "#9B72FF",
  },
  {
    id: "p2",
    name: "Rocky",
    owner: "Carlos López",
    phone: "912345678",
    email: "",
    species: "Canino",
    breed: "Labrador",
    coatColor: "Dorado",
    age: "5 años",
    dob: "2020-01-01",
    weight: "28kg",
    status: "Activo",
    lastVisit: "2026-02-28",
    avatar: "🐶",
    color: "#FFB347",
  },
];
const SEED_VISITS = [];
const SEED_VACCINES = [];
const todayStr = new Date().toISOString().split("T")[0];
const SEED_APPOINTMENTS = [
  {
    id: "a1",
    date: todayStr,
    time: "09:00",
    petId: "p1",
    pet: "Luna",
    owner: "María García",
    type: "Vacunación",
    diagnosis: "Chequeo previo a vacunación",
    notes: "",
    status: "Confirmado",
    avatar: "🐱",
  },
];
const SEED_INVENTORY = [];

// ─── COLORS & STYLES ─────────────────────────────────────────────────────────
const C = {
  bg: "#F4F7F9",
  surface: "#FFFFFF",
  surfaceHover: "#F1F5F9",
  border: "#E2E8F0",
  accent: "#00D4A0",
  accentDim: "#00D4A015",
  text: "#1E293B",
  textMuted: "#64748B",
  textDim: "#94A3B8",
  danger: "#FF4D6D",
  warning: "#FFB347",
  info: "#4DA6FF",
  purple: "#9B72FF",
};

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};}
  ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .fade-in{animation:fadeIn .35s ease forwards;}
  .badge-pulse{animation:pulse 2s infinite;}
  .spinner{width:20px;height:20px;border:2px solid ${C.border};border-top-color:${C.accent};border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Badge({ children, color = C.accent }) {
  return (
    <span
      style={{
        background: color + "15",
        color: color === C.textMuted ? "#475569" : color,
        border: `1px solid ${color}30`,
        borderRadius: 6,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".5px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          {label}
        </div>
      )}
      <input
        {...props}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontSize: 14,
          outline: "none",
          fontFamily: "inherit",
          ...(props.style || {}),
        }}
      />
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [form, setForm] = useState({
    name: "",
    clinic: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        onAuth(cred.user);
      } else if (mode === "register") {
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        const profile = {
          id: cred.user.uid,
          name: form.name,
          clinic: form.clinic,
          email: form.email,
          registeredAt: new Date().toISOString(),
        };
        await cloud.save(cred.user.uid, "profile", profile);
        await cloud.save(cred.user.uid, "pets", SEED_PETS);
        await cloud.save(cred.user.uid, "visits", SEED_VISITS);
        await cloud.save(cred.user.uid, "vaccines", SEED_VACCINES);
        await cloud.save(cred.user.uid, "appointments", SEED_APPOINTMENTS);
        await cloud.save(cred.user.uid, "inventory", SEED_INVENTORY);
        sendRegistrationEmail(form.name, form.clinic, form.email);
        onAuth(cred.user);
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, form.email);
        setResetSent(true);
      }
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/user-not-found": "No existe una cuenta con ese correo.",
        "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
        "auth/invalid-email": "El correo ingresado no es válido.",
        "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
      };
      setError(msgs[err.code] || err.message);
    }
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setResetSent(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* ── HERO ── */}
      <div
        style={{
          background: `linear-gradient(135deg, #F0FDF4, #E0F2FE)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: C.accent + "20",
            border: `1px solid ${C.accent}40`,
            borderRadius: 100,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            color: "#0f766e",
            marginBottom: 32,
            width: "fit-content",
          }}
        >
          🐾 MVP · VetCare Pro
        </div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 48,
            lineHeight: 1.1,
            marginBottom: 20,
            color: "#1E293B",
          }}
        >
          La plataforma veterinaria
          <br />
          <span style={{ color: "#00b386" }}>que crece contigo</span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: "#475569",
            lineHeight: 1.7,
            maxWidth: 360,
          }}
        >
          Gestiona pacientes, citas, e historial clínico. Datos guardados en la
          nube — accesibles desde cualquier dispositivo.
        </p>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            ["☁️", "Datos en la nube, recuperables con tu correo"],
            ["📋", "Historial clínico completo por paciente"],
            ["💉", "Control de vacunas y alertas automáticas"],
            ["🔒", "Contraseña recuperable en cualquier momento"],
          ].map(([icon, text]) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                color: "#475569",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: C.accent + "20",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── FORM SIDE ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 40px",
          background: C.surface,
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* ── FORGOT PASSWORD VIEW ── */}
          {mode === "forgot" && (
            <>
              <button
                onClick={() => switchMode("login")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: C.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 24,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Volver al inicio de sesión
              </button>

              {resetSent ? (
                /* ── SUCCESS STATE ── */
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                  }}
                >
                  <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    ¡Correo enviado!
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginBottom: 24,
                    }}
                  >
                    Revisa tu bandeja de entrada en{" "}
                    <strong>{form.email}</strong>. Haz clic en el enlace del
                    correo para restablecer tu contraseña.
                  </p>
                  <div
                    style={{
                      background: C.accent + "12",
                      border: `1px solid ${C.accent}30`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "#0f766e",
                      marginBottom: 24,
                      textAlign: "left",
                    }}
                  >
                    💡 Si no lo ves, revisa tu carpeta de{" "}
                    <strong>spam o correo no deseado</strong>.
                  </div>
                  <button
                    onClick={() => switchMode("login")}
                    style={{
                      width: "100%",
                      padding: 13,
                      background: C.accent,
                      color: "#1E293B",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                    }}
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                /* ── FORGOT FORM ── */
                <>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 28,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Recuperar contraseña
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      marginBottom: 28,
                      lineHeight: 1.5,
                    }}
                  >
                    Ingresa tu correo y te enviaremos un enlace para restablecer
                    tu contraseña.
                  </p>
                  {error && (
                    <div
                      style={{
                        background: "#FF4D6D15",
                        color: C.danger,
                        border: `1px solid ${C.danger}30`,
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      ⚠️ {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <Input
                      label="Correo electrónico"
                      type="email"
                      required
                      placeholder="vet@clinica.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: "100%",
                        padding: 13,
                        background: C.accent,
                        color: "#1E293B",
                        border: "none",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                        opacity: loading ? 0.7 : 1,
                      }}
                    >
                      {loading
                        ? "Enviando..."
                        : "Enviar enlace de recuperación"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ── LOGIN / REGISTER VIEW ── */}
          {mode !== "forgot" && (
            <>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 30,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {mode === "login" ? "Bienvenido de vuelta" : "Crear cuenta"}
              </div>
              <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 28 }}>
                {mode === "login"
                  ? "Ingresa con tu correo para acceder a tus datos"
                  : "Regístrate — tus datos quedan seguros"}
              </p>
              {error && (
                <div
                  style={{
                    background: "#FF4D6D15",
                    color: C.danger,
                    border: `1px solid ${C.danger}30`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  ⚠️ {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                {mode === "register" && (
                  <>
                    <Input
                      label="Tu nombre"
                      required
                      placeholder="Dr. García"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                    <Input
                      label="Nombre de la clínica"
                      required
                      placeholder="Clínica Veterinaria..."
                      value={form.clinic}
                      onChange={(e) =>
                        setForm({ ...form, clinic: e.target.value })
                      }
                    />
                  </>
                )}
                <Input
                  label="Correo electrónico"
                  type="email"
                  required
                  placeholder="vet@clinica.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <div style={{ position: "relative" }}>
                  <Input
                    label="Contraseña"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  {/* Forgot password link — solo visible en login */}
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#00b386",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: 13,
                    background: C.accent,
                    color: "#1E293B",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    marginTop: 4,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? "Cargando..."
                    : mode === "login"
                    ? "Entrar al panel"
                    : "Crear cuenta"}
                </button>
              </form>

              <div
                style={{ height: 1, background: C.border, margin: "20px 0" }}
              />
              <p
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: C.textMuted,
                }}
              >
                {mode === "login" ? "¿Eres nuevo?" : "¿Ya tienes cuenta?"}{" "}
                <span
                  style={{
                    color: "#00b386",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                  onClick={() =>
                    switchMode(mode === "login" ? "register" : "login")
                  }
                >
                  {mode === "login" ? "Regístrate gratis" : "Inicia sesión"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ─── MAIN PLATFORM ────────────────────────────────────────────────────────────
export default function VetPlatform() {
  const [authUser, setAuthUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedPet, setSelectedPet] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]); // in-memory PDF/image results
  const [aptPrefill, setAptPrefill] = useState(null);

  const [pets, setPets] = useState([]);
  const [visits, setVisits] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const data = await cloud.loadAll(user.uid);
        if (data.profile) setProfile(data.profile);
        setPets(data.pets);
        setVisits(data.visits);
        setVaccines(data.vaccines);
        setAppointments(data.appointments);
        setInventory(data.inventory);
      } else {
        setAuthUser(null);
      }
    });
    return unsub;
  }, []);

  const save = useCallback(
    async (key, data) => {
      if (!authUser) return;
      setSaving(true);
      try {
        await cloud.save(authUser.uid, key, data);
      } catch (e) {
        console.error(e);
      }
      setSaving(false);
    },
    [authUser]
  );

  const savePets = async (d) => {
    setPets(d);
    await save("pets", d);
  };
  const saveVisits = async (d) => {
    setVisits(d);
    await save("visits", d);
  };
  const saveVaccines = async (d) => {
    setVaccines(d);
    await save("vaccines", d);
  };
  const saveAppointments = async (d) => {
    setAppointments(d);
    await save("appointments", d);
  };
  const saveInventory = async (d) => {
    setInventory(d);
    await save("inventory", d);
  };

  if (authUser === undefined)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
        }}
      >
        <p>Cargando...</p>
      </div>
    );
  if (!authUser)
    return (
      <>
        <style>{FONT}</style>
        <AuthScreen onAuth={setAuthUser} />
      </>
    );

  const MENU = [
    { key: "dashboard", icon: "⊞", label: "Dashboard" },
    {
      key: "appointments",
      icon: "📅",
      label: "Citas",
      badge: appointments.filter(
        (a) => a.status === "En espera" || a.status === "En consulta"
      ).length,
    },
    { key: "patients", icon: "🐾", label: "Pacientes" },
    { key: "records", icon: "📋", label: "Historial" },
    { key: "inventory", icon: "🏥", label: "Inventario" },
  ];

  const todayDate = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter(
    (a) => a.date === todayDate
  ).length;
  const internados = pets.filter((p) => p.status === "Internado");

  const stats = [
    { label: "Pacientes", value: pets.length, icon: "🏥", color: C.accent },
    {
      label: "Citas programadas hoy",
      value: todayAppointments,
      icon: "📅",
      color: C.info,
    },
    {
      label: "Internados",
      value: internados.length,
      icon: "🏨",
      color: C.purple,
    },
  ];

  return (
    <>
      <style>{FONT}</style>
      {showModal === "new-appointment" && (
        <NewAppointmentModal
          pets={pets}
          prefill={aptPrefill}
          onClose={() => {
            setShowModal(null);
            setAptPrefill(null);
          }}
          onSave={async (apt) => {
            await saveAppointments([apt, ...appointments]);
            setShowModal(null);
            setAptPrefill(null);
          }}
        />
      )}
      {showModal === "new-patient" && (
        <NewPatientModal
          onClose={() => setShowModal(null)}
          onSave={async (pet) => {
            await savePets([pet, ...pets]);
            setShowModal(null);
          }}
        />
      )}
      {showModal === "new-visit" && selectedPet && (
        <NewVisitModal
          pet={selectedPet}
          onClose={() => setShowModal(null)}
          onSave={async (v) => {
            await saveVisits([v, ...visits]);
            setShowModal(null);
          }}
        />
      )}
      {showModal === "new-vaccine" && selectedPet && (
        <NewVaccineModal
          pet={selectedPet}
          onClose={() => setShowModal(null)}
          onSave={async (v) => {
            await saveVaccines([v, ...vaccines]);
            setShowModal(null);
          }}
        />
      )}
      {showModal === "admit-internado" && (
        <AdmitInternadoModal
          pets={pets.filter((p) => p.status !== "Internado")}
          onClose={() => setShowModal(null)}
          onSave={async ({ petId, admissionDate, reason, notes }) => {
            const updated = pets.map((p) =>
              p.id === petId
                ? {
                    ...p,
                    status: "Internado",
                    admissionDate,
                    admissionReason: reason,
                    admissionNotes: notes,
                  }
                : p
            );
            await savePets(updated);
            setShowModal(null);
          }}
        />
      )}

      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        {/* ── SIDEBAR ── */}
        <div
          style={{
            width: 220,
            background: C.surface,
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            padding: "24px 0",
            position: "fixed",
            height: "100vh",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "0 20px 24px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: C.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🐾
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  VetCare
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.textMuted,
                    letterSpacing: ".5px",
                  }}
                >
                  MVP PLATFORM
                </div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "16px 12px" }}>
            {MENU.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setPage(item.key);
                  setSelectedPet(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: page === item.key ? C.accentDim : "transparent",
                  color: page === item.key ? "#0f766e" : C.textMuted,
                  fontSize: 14,
                  fontWeight: page === item.key ? 700 : 500,
                  marginBottom: 2,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
                {item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: C.danger,
                      color: "#fff",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div
            style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: saving ? C.warning : "#00b386",
                marginBottom: 12,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: saving ? C.warning : "#00b386",
                  animation: "pulse 2s infinite",
                }}
              />
              {saving ? "Guardando..." : "Sincronizado ☁️"}
            </div>
            <button
              onClick={() =>
                exportData(
                  profile,
                  pets,
                  visits,
                  vaccines,
                  appointments,
                  inventory
                )
              }
              style={{
                width: "100%",
                padding: "7px",
                background: "#F1F5F9",
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              ⬇ Exportar mis datos
            </button>
            <button
              onClick={() => signOut(auth)}
              style={{
                width: "100%",
                padding: "7px",
                background: "transparent",
                color: C.textMuted,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div
          style={{ marginLeft: 220, flex: 1, padding: 32, minHeight: "100vh" }}
        >
          {page === "dashboard" && (
            <DashboardPage
              stats={stats}
              appointments={appointments}
              pets={pets}
              vaccines={vaccines}
              internados={internados}
              onNewAppointment={() => setShowModal("new-appointment")}
              onNewPatient={() => setShowModal("new-patient")}
              onAdmitInternado={() => setShowModal("admit-internado")}
              onDischargeInternado={async (petId) => {
                const updated = pets.map((p) =>
                  p.id === petId
                    ? {
                        ...p,
                        status: "Activo",
                        admissionDate: null,
                        admissionReason: null,
                        admissionNotes: null,
                      }
                    : p
                );
                await savePets(updated);
              }}
              onSelectPet={(p) => {
                setSelectedPet(p);
                setPage("patients");
              }}
            />
          )}
          {page === "appointments" && (
            <AppointmentsPage
              appointments={appointments}
              onAdd={(prefill) => {
                setAptPrefill(prefill || null);
                setShowModal("new-appointment");
              }}
              onUpdate={saveAppointments}
            />
          )}
          {page === "patients" && !selectedPet && (
            <PatientsPage
              pets={pets}
              vaccines={vaccines}
              visits={visits}
              onSelect={(p) => setSelectedPet(p)}
              onAdd={() => setShowModal("new-patient")}
            />
          )}
          {page === "patients" && selectedPet && (
            <PatientDetail
              pet={selectedPet}
              visits={visits.filter((v) => v.petId === selectedPet.id)}
              vaccines={vaccines.filter((v) => v.petId === selectedPet.id)}
              appointments={appointments.filter(
                (a) => a.petId === selectedPet.id
              )}
              onBack={() => setSelectedPet(null)}
              onAddVisit={() => setShowModal("new-visit")}
              onAddVaccine={() => setShowModal("new-vaccine")}
              onUpdatePet={async (updatedPet) => {
                const newPets = pets.map((p) =>
                  p.id === updatedPet.id ? updatedPet : p
                );
                await savePets(newPets);
                setSelectedPet(updatedPet);
              }}
              onDelete={async () => {
                await savePets(pets.filter((p) => p.id !== selectedPet.id));
                setSelectedPet(null);
              }}
            />
          )}
          {page === "records" && (
            <RecordsPage
              visits={visits}
              pets={pets}
              vaccines={vaccines}
              results={results}
              onAddResult={(r) => setResults((prev) => [r, ...prev])}
              onDeleteResult={(id) =>
                setResults((prev) => prev.filter((r) => r.id !== id))
              }
              onUpdateVisits={saveVisits}
              onUpdateVaccines={saveVaccines}
            />
          )}
          {page === "inventory" && (
            <InventarioPage inventory={inventory} onUpdate={saveInventory} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({
  stats,
  appointments,
  pets,
  vaccines,
  internados,
  onNewAppointment,
  onNewPatient,
  onAdmitInternado,
  onDischargeInternado,
  onSelectPet,
}) {
  const statusColor = {
    Confirmado: C.accent,
    "En espera": C.warning,
    "En consulta": C.info,
    Pendiente: C.textMuted,
  };
  const today = new Date();
  const expiredVaccines = vaccines.filter((v) => {
    const dueDate = new Date(v.nextDue);
    return v.status === "vencida" || dueDate < today;
  });

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Panel Principal 👋
        </div>
        <div style={{ color: C.textMuted, fontSize: 14 }}>
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg,#F1F5F9,#FFFFFF)",
          borderRadius: 14,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: `1px solid ${C.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
            ☁️ Tus datos están seguros en la nube
          </div>
          <div style={{ fontSize: 11, color: C.textMuted }}>
            Exporta tu información en cualquier momento.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onNewPatient}
            style={{
              padding: "7px 14px",
              background: C.surface,
              color: "#1E293B",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            + Paciente
          </button>
          <button
            onClick={onNewAppointment}
            style={{
              padding: "7px 14px",
              background: C.accent,
              color: "#000",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            + Cita
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 16,
        }}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="fade-in"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 24,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>Próximas Citas</div>
            <button
              onClick={onNewAppointment}
              style={{
                background: C.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Nueva
            </button>
          </div>
          {appointments
            .filter((a) => a.date >= new Date().toISOString().split("T")[0])
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
            )
            .slice(0, 5)
            .map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 0",
                  borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div style={{ fontSize: 24 }}>{a.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {a.pet}{" "}
                    <span style={{ color: C.textMuted, fontWeight: 400 }}>
                      — {a.owner}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}
                  >
                    {a.type} · {a.date}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 13, color: "#0f766e" }}
                  >
                    {a.time}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Badge color={statusColor[a.status] || C.textMuted}>
                      {a.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          {appointments.length === 0 && (
            <div style={{ fontSize: 13, color: C.textMuted }}>
              No hay citas próximas.
            </div>
          )}
        </Card>

        <Card>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 12,
              color: C.danger,
            }}
          >
            ⚠ Vacunas Vencidas
          </div>
          {expiredVaccines.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted }}>
              Sin alertas de vacunas. Todo al día.
            </div>
          ) : (
            expiredVaccines.map((v, i) => {
              const pet = pets.find((p) => p.id === v.petId);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom:
                      i < expiredVaccines.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                  }}
                >
                  <div style={{ fontSize: 24 }}>💉</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      Paciente: {pet ? pet.name : "Desconocido"}
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.danger,
                    }}
                  >
                    Venció: {v.nextDue}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              🏨 Pacientes Internados
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {internados.length} paciente{internados.length !== 1 ? "s" : ""}{" "}
              actualmente internado{internados.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onAdmitInternado}
            style={{
              background: C.purple,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + Internar paciente
          </button>
        </div>
        {internados.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏥</div>
            No hay pacientes internados actualmente.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {internados.map((p, i) => (
              <div
                key={i}
                style={{
                  background: C.purple + "08",
                  border: `1.5px solid ${C.purple}25`,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: p.color + "20",
                      border: `2px solid ${p.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {p.breed} · {p.species}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <Badge color={C.purple}>Internado</Badge>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {[
                    ["👤 Dueño", p.owner],
                    ["📞 Teléfono", p.phone || "—"],
                    ["📅 Ingresó", p.admissionDate || "—"],
                    ["⚖️ Peso", p.weight || "—"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        background: C.surface,
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textDim,
                          fontWeight: 600,
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.text,
                          marginTop: 2,
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
                {p.admissionReason && (
                  <div
                    style={{
                      background: C.warning + "12",
                      border: `1px solid ${C.warning}30`,
                      borderRadius: 8,
                      padding: "8px 12px",
                      marginBottom: 10,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: C.warning }}>
                      Motivo:{" "}
                    </span>
                    {p.admissionReason}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => onSelectPet(p)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      color: C.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    Ver ficha
                  </button>
                  <button
                    onClick={() => onDischargeInternado(p.id)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      background: C.accent + "15",
                      border: `1px solid ${C.accent}30`,
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 12,
                      color: "#0f766e",
                      fontWeight: 700,
                    }}
                  >
                    ✓ Dar de alta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── ADMIT INTERNADO MODAL ────────────────────────────────────────────────────
function AdmitInternadoModal({ pets, onClose, onSave }) {
  const [form, setForm] = useState({
    petId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });
  return (
    <ModalWrap title="🏨 Internar Paciente" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Seleccionar Paciente *
        </div>
        <select
          value={form.petId}
          onChange={(e) => setForm({ ...form, petId: e.target.value })}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
          }}
        >
          <option value="">— Elige un paciente —</option>
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name} ({p.owner})
            </option>
          ))}
        </select>
      </div>
      <Input
        label="Fecha de ingreso"
        type="date"
        value={form.admissionDate}
        onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
      />
      <Input
        label="Motivo de internamiento *"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
        placeholder="Ej: Post-operatorio, observación, tratamiento IV..."
      />
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Notas adicionales
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Indicaciones, medicación, cuidados especiales..."
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.petId || !form.reason}
          onClick={() => onSave(form)}
          style={{
            flex: 1,
            padding: 11,
            background: C.purple,
            border: "none",
            color: "#fff",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.petId || !form.reason ? 0.5 : 1,
          }}
        >
          Internar
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── APPOINTMENTS PAGE ────────────────────────────────────────────────────────
// ─── APPOINTMENTS PAGE ────────────────────────────────────────────────────────
function AppointmentsPage({ appointments, onAdd, onUpdate }) {
  const [view, setView] = useState("Semana");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedApt, setSelectedApt] = useState(null);

  const STATUS_COLOR = {
    Confirmado: C.accent,
    "En espera": C.warning,
    "En consulta": C.info,
    Pendiente: C.textMuted,
    Completado: C.purple,
    Cancelado: C.danger,
  };
  const STATUS_BG = {
    Confirmado: "#00D4A018",
    "En espera": "#FFB34718",
    "En consulta": "#4DA6FF18",
    Pendiente: "#64748B12",
    Completado: "#9B72FF18",
    Cancelado: "#FF4D6D12",
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const cycleStatus = async (apt, e) => {
    e && e.stopPropagation();
    const cycle = [
      "Pendiente",
      "Confirmado",
      "En espera",
      "En consulta",
      "Completado",
    ];
    if (apt.status === "Cancelado") return;
    const next = cycle[(cycle.indexOf(apt.status) + 1) % cycle.length];
    await onUpdate(
      appointments.map((a) => (a.id === apt.id ? { ...a, status: next } : a))
    );
    if (selectedApt?.id === apt.id) setSelectedApt({ ...apt, status: next });
  };

  const cancelApt = async (apt) => {
    await onUpdate(
      appointments.map((a) =>
        a.id === apt.id ? { ...a, status: "Cancelado" } : a
      )
    );
    if (selectedApt?.id === apt.id)
      setSelectedApt({ ...apt, status: "Cancelado" });
  };

  const deleteApt = async (apt) => {
    await onUpdate(appointments.filter((a) => a.id !== apt.id));
    setSelectedApt(null);
  };

  // ── SHARED HEADER ──────────────────────────────────────────────────────────
  const ViewTabs = () => (
    <div
      style={{
        display: "flex",
        background: C.bg,
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {[
        ["Hoy", "📋"],
        ["Semana", "📅"],
        ["Mes", "🗓"],
        ["Lista", "☰"],
      ].map(([v, icon]) => (
        <button
          key={v}
          onClick={() => setView(v)}
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            background: view === v ? C.surface : "transparent",
            color: view === v ? C.text : C.textMuted,
            boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all .15s",
          }}
        >
          {icon} {v}
        </button>
      ))}
    </div>
  );

  // ── HOY VIEW ───────────────────────────────────────────────────────────────
  const TodayView = () => {
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm
    const todayApts = appointments
      .filter((a) => a.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time));
    const getAptForHour = (h) =>
      todayApts.filter((a) => {
        const ah = parseInt(a.time?.split(":")[0] || "0");
        return ah === h;
      });
    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: C.accent + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#0f766e",
                }}
              >
                {today.getDate()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {today.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted }}>
                  {todayApts.length} cita{todayApts.length !== 1 ? "s" : ""}{" "}
                  programadas
                </div>
              </div>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 520 }}>
              {HOURS.map((h) => {
                const apts = getAptForHour(h);
                return (
                  <div
                    key={h}
                    style={{
                      display: "flex",
                      minHeight: 60,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        padding: "8px 0 0 14px",
                        fontSize: 12,
                        color: C.textDim,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                    </div>
                    <div
                      onClick={() =>
                        onAdd({
                          date: todayStr,
                          time: `${String(h).padStart(2, "0")}:00`,
                        })
                      }
                      style={{
                        flex: 1,
                        padding: "6px 10px 6px 6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        cursor: "cell",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.accent + "07";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {apts.map((a, i) => (
                        <div
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApt(a);
                          }}
                          style={{
                            background: STATUS_BG[a.status] || "#F1F5F9",
                            border: `1.5px solid ${
                              STATUS_COLOR[a.status] || C.border
                            }30`,
                            borderLeft: `3px solid ${
                              STATUS_COLOR[a.status] || C.border
                            }`,
                            borderRadius: 8,
                            padding: "6px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "transform .15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform =
                              "translateX(3px)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "translateX(0)")
                          }
                        >
                          <span style={{ fontSize: 16 }}>{a.avatar}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              {a.pet}
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>
                              {a.owner} · {a.type}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: STATUS_COLOR[a.status],
                            }}
                          >
                            {a.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        {selectedApt && (
          <AptDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onCycle={cycleStatus}
          />
        )}
      </div>
    );
  };

  // ── SEMANA VIEW ────────────────────────────────────────────────────────────
  const WeekView = () => {
    // Get Monday of current week + offset
    const baseMonday = new Date(today);
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    baseMonday.setDate(today.getDate() - dow + weekOffset * 7);

    const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const DAYS_FULL = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      return d;
    });

    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    const fmtRange = `${weekStart.getDate()} ${weekStart.toLocaleDateString(
      "es-ES",
      { month: "short" }
    )} — ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    })}`;

    const getApts = (dayDate, hour) => {
      const ds = dayDate.toISOString().split("T")[0];
      return appointments.filter(
        (a) => a.date === ds && parseInt(a.time?.split(":")[0] || "0") === hour
      );
    };

    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <Card style={{ padding: 0 }}>
            {/* Week nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                ‹
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtRange}</div>
                {weekOffset === 0 && (
                  <div
                    style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}
                  >
                    Esta semana
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    style={{
                      background: C.accentDim,
                      border: `1px solid ${C.accent}30`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f766e",
                    }}
                  >
                    Hoy
                  </button>
                )}
                <button
                  onClick={() => setWeekOffset((w) => w + 1)}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.text,
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 760 }}>
                {/* Day headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px repeat(7,1fr)",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div />
                  {weekDays.map((d, i) => {
                    const ds = d.toISOString().split("T")[0];
                    const isToday = ds === todayStr;
                    const dayApts = appointments.filter(
                      (a) => a.date === ds
                    ).length;
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          borderLeft: `1px solid ${C.border}`,
                          background: isToday ? C.accent + "10" : "transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: isToday ? "#0f766e" : C.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: ".5px",
                          }}
                        >
                          {DAYS_ES[i]}
                        </div>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: isToday ? C.accent : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "4px auto 2px",
                            fontWeight: 800,
                            fontSize: 16,
                            color: isToday ? "#fff" : C.text,
                          }}
                        >
                          {d.getDate()}
                        </div>
                        {dayApts > 0 && (
                          <div
                            style={{
                              fontSize: 10,
                              background: isToday ? "#0f766e" : C.info,
                              color: "#fff",
                              borderRadius: 100,
                              padding: "1px 6px",
                              display: "inline-block",
                              fontWeight: 700,
                            }}
                          >
                            {dayApts}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time rows */}
                <div style={{ overflowY: "auto", maxHeight: 480 }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "52px repeat(7,1fr)",
                        borderBottom: `1px solid ${C.border}`,
                        minHeight: 64,
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 4px 0 10px",
                          fontSize: 11,
                          color: C.textDim,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {h > 12 ? `${h - 12}pm` : h === 12 ? "12pm" : `${h}am`}
                      </div>
                      {weekDays.map((d, di) => {
                        const ds = d.toISOString().split("T")[0];
                        const isToday = ds === todayStr;
                        const apts = getApts(d, h);
                        return (
                          <div
                            key={di}
                            onClick={() =>
                              onAdd({
                                date: ds,
                                time: `${String(h).padStart(2, "0")}:00`,
                              })
                            }
                            style={{
                              borderLeft: `1px solid ${C.border}`,
                              padding: "4px 5px",
                              background: isToday
                                ? C.accent + "04"
                                : "transparent",
                              display: "flex",
                              flexDirection: "column",
                              gap: 3,
                              cursor: "cell",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = isToday
                                ? C.accent + "10"
                                : C.accent + "07";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isToday
                                ? C.accent + "04"
                                : "transparent";
                            }}
                          >
                            {apts.map((a, ai) => (
                              <div
                                key={ai}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApt(a);
                                }}
                                style={{
                                  background: STATUS_COLOR[a.status] + "20",
                                  borderLeft: `2.5px solid ${
                                    STATUS_COLOR[a.status] || C.border
                                  }`,
                                  borderRadius: "0 6px 6px 0",
                                  padding: "3px 6px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  lineHeight: 1.3,
                                  transition: "opacity .15s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.opacity = ".75")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.opacity = "1")
                                }
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {a.time} {a.avatar}
                                </div>
                                <div
                                  style={{
                                    color: C.textMuted,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {a.pet}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
        {selectedApt && (
          <AptDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onCycle={cycleStatus}
          />
        )}
      </div>
    );
  };

  // ── MES VIEW ───────────────────────────────────────────────────────────────
  const MonthView = () => {
    const refDate = new Date(
      today.getFullYear(),
      today.getMonth() + monthOffset,
      1
    );
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday-start offset
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const monthName = refDate.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });

    const cells = Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
      const d = new Date(year, month, dayNum);
      const ds = d.toISOString().split("T")[0];
      return { dayNum, ds, isToday: ds === todayStr, isPast: d < today };
    });

    const getMonthApts = (ds) => appointments.filter((a) => a.date === ds);

    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <Card style={{ padding: 0 }}>
            {/* Month nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                ‹
              </button>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    textTransform: "capitalize",
                  }}
                >
                  {monthName}
                </div>
                {monthOffset !== 0 && (
                  <button
                    onClick={() => setMonthOffset(0)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: C.accent,
                      fontWeight: 700,
                    }}
                  >
                    ← Volver a hoy
                  </button>
                )}
              </div>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                ›
              </button>
            </div>

            {/* Day names header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {DAYS_ES.map((d) => (
                <div
                  key={d}
                  style={{
                    padding: "10px 0",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: ".6px",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}
            >
              {cells.map((cell, i) => {
                if (!cell)
                  return (
                    <div
                      key={i}
                      style={{
                        minHeight: 100,
                        borderRight: `1px solid ${C.border}`,
                        borderBottom: `1px solid ${C.border}`,
                        background: "#FAFBFC",
                      }}
                    />
                  );
                const { dayNum, ds, isToday, isPast } = cell;
                const apts = getMonthApts(ds);
                const MAX_SHOW = 3;
                return (
                  <div
                    key={i}
                    onClick={() => onAdd({ date: ds })}
                    style={{
                      minHeight: 100,
                      borderRight: `1px solid ${C.border}`,
                      borderBottom: `1px solid ${C.border}`,
                      padding: "8px 6px",
                      background: isToday ? C.accent + "08" : "transparent",
                      position: "relative",
                      cursor: "cell",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isToday
                        ? C.accent + "14"
                        : C.accent + "06";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isToday
                        ? C.accent + "08"
                        : "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: isToday ? C.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: isToday || apts.length > 0 ? 700 : 400,
                        fontSize: 13,
                        color: isToday ? "#fff" : isPast ? C.textDim : C.text,
                        marginBottom: 4,
                      }}
                    >
                      {dayNum}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {apts.slice(0, MAX_SHOW).map((a, ai) => (
                        <div
                          key={ai}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApt(a);
                          }}
                          style={{
                            background: STATUS_COLOR[a.status] + "22",
                            borderLeft: `2px solid ${STATUS_COLOR[a.status]}`,
                            borderRadius: "0 5px 5px 0",
                            padding: "2px 5px",
                            fontSize: 10,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                            cursor: "pointer",
                          }}
                        >
                          {a.time} {a.avatar} {a.pet}
                        </div>
                      ))}
                      {apts.length > MAX_SHOW && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.accent,
                            fontWeight: 700,
                            paddingLeft: 4,
                          }}
                        >
                          +{apts.length - MAX_SHOW} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {Object.entries(STATUS_COLOR).map(([s, c]) => (
                <div
                  key={s}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: c,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: C.textMuted,
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        {selectedApt && (
          <AptDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onCycle={cycleStatus}
          />
        )}
      </div>
    );
  };

  // ── LISTA VIEW (tabla completa) ────────────────────────────────────────────
  const ListView = () => {
    const [statusFilter, setStatusFilter] = useState("Todos");
    const filtered = appointments.filter(
      (a) => statusFilter === "Todos" || a.status === statusFilter
    );
    const grouped = filtered.reduce((acc, a) => {
      (acc[a.date] = acc[a.date] || []).push(a);
      return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            "Todos",
            "Confirmado",
            "En espera",
            "En consulta",
            "Pendiente",
            "Completado",
            "Cancelado",
          ].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                background: statusFilter === f ? C.accentDim : C.surface,
                color: statusFilter === f ? "#0f766e" : C.textMuted,
                border: `1px solid ${statusFilter === f ? C.accent : C.border}`,
                borderRadius: 8,
                padding: "5px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {f}
            </button>
          ))}
        </div>
        {sortedDates.length === 0 ? (
          <Card>
            <div
              style={{ textAlign: "center", padding: 32, color: C.textMuted }}
            >
              No hay citas registradas.
            </div>
          </Card>
        ) : (
          sortedDates.map((date) => {
            const d = new Date(date + "T00:00:00");
            const isToday = date === todayStr;
            return (
              <div key={date}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: isToday ? C.accent : C.border + "60",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 14,
                      color: isToday ? "#fff" : C.textMuted,
                    }}
                  >
                    {d.getDate()}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {d.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {grouped[date].length} cita
                      {grouped[date].length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {isToday && <Badge color={C.accent}>Hoy</Badge>}
                </div>
                <Card style={{ padding: 0 }}>
                  {[...grouped[date]]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((a, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedApt(a)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 20px",
                          borderBottom:
                            i < grouped[date].length - 1
                              ? `1px solid ${C.border}`
                              : "none",
                          cursor: "pointer",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = C.surfaceHover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div style={{ fontSize: 22 }}>{a.avatar}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {a.pet}{" "}
                            <span
                              style={{
                                color: C.textMuted,
                                fontWeight: 400,
                                fontSize: 13,
                              }}
                            >
                              — {a.owner}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>
                            {a.type}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: "#0f766e",
                            minWidth: 40,
                            textAlign: "right",
                          }}
                        >
                          {a.time}
                        </div>
                        <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                        {a.status !== "Cancelado" &&
                          a.status !== "Completado" && (
                            <button
                              onClick={(e) => cycleStatus(a, e)}
                              style={{
                                background: "transparent",
                                border: `1px solid ${C.border}`,
                                color: C.text,
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              →
                            </button>
                          )}
                        {a.status !== "Cancelado" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelApt(a);
                            }}
                            style={{
                              background: C.warning + "15",
                              border: `1px solid ${C.warning}30`,
                              color: "#92400e",
                              borderRadius: 6,
                              padding: "4px 10px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            ✕
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteApt(a);
                          }}
                          style={{
                            background: C.danger + "10",
                            border: `1px solid ${C.danger}25`,
                            color: C.danger,
                            borderRadius: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                </Card>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const AptDetailPanel = ({ apt, onClose, onCycle }) => (
    <div className="fade-in" style={{ width: 280, flexShrink: 0 }}>
      <Card style={{ position: "sticky", top: 0, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>Detalle de cita</div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: C.textMuted,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            padding: "12px 14px",
            background: C.bg,
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 36 }}>{apt.avatar}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{apt.pet}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{apt.owner}</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            ["📅 Fecha", apt.date],
            ["🕐 Hora", apt.time],
            ["🏷 Tipo", apt.type],
            ["👤 Propietario", apt.owner],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span
                style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}
              >
                {k}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {apt.diagnosis && (
            <div
              style={{
                padding: "8px 12px",
                background: C.info + "10",
                borderRadius: 8,
                fontSize: 12,
                color: C.text,
                lineHeight: 1.5,
                border: `1px solid ${C.info}20`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.info,
                  marginBottom: 3,
                  fontSize: 11,
                }}
              >
                📋 DIAGNÓSTICO
              </div>
              {apt.diagnosis}
            </div>
          )}
          {apt.notes && (
            <div
              style={{
                padding: "8px 12px",
                background: C.warning + "10",
                borderRadius: 8,
                fontSize: 12,
                color: C.text,
                lineHeight: 1.5,
                border: `1px solid ${C.warning}20`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.warning,
                  marginBottom: 3,
                  fontSize: 11,
                }}
              >
                📝 NOTAS
              </div>
              {apt.notes}
            </div>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: C.textMuted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: 8,
            }}
          >
            Estado actual
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              "Pendiente",
              "Confirmado",
              "En espera",
              "En consulta",
              "Completado",
              "Cancelado",
            ].map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontWeight: 600,
                  background: apt.status === s ? STATUS_COLOR[s] + "25" : C.bg,
                  color: apt.status === s ? STATUS_COLOR[s] : C.textDim,
                  border: `1px solid ${
                    apt.status === s ? STATUS_COLOR[s] + "40" : C.border
                  }`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        {apt.status !== "Cancelado" && apt.status !== "Completado" && (
          <button
            onClick={(e) => onCycle(apt, e)}
            style={{
              width: "100%",
              padding: "10px",
              background: C.accent,
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              color: "#000",
              marginBottom: 8,
            }}
          >
            Avanzar estado →
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {apt.status !== "Cancelado" && (
            <button
              onClick={() => cancelApt(apt)}
              style={{
                flex: 1,
                padding: "8px",
                background: C.warning + "15",
                border: `1px solid ${C.warning}30`,
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                color: "#92400e",
              }}
            >
              ✕ Cancelar
            </button>
          )}
          <button
            onClick={() => deleteApt(apt)}
            style={{
              flex: 1,
              padding: "8px",
              background: C.danger + "10",
              border: `1px solid ${C.danger}30`,
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 12,
              color: C.danger,
            }}
          >
            🗑 Eliminar
          </button>
        </div>
      </Card>
    </div>
  );

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  const todayApts = appointments.filter((a) => a.date === todayStr).length;
  const weekApts = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return appointments.filter((a) => {
      const ad = new Date(a.date + "T00:00:00");
      return ad >= today && ad <= d;
    }).length;
  })();
  const pendingApts = appointments.filter(
    (a) => a.status === "Pendiente" || a.status === "En espera"
  ).length;

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Gestión de Citas
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            {appointments.length} citas registradas
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ViewTabs />
          <button
            onClick={onAdd}
            style={{
              background: C.accent,
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            + Nueva Cita
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
        }}
      >
        {[
          { label: "Citas hoy", value: todayApts, icon: "☀️", color: C.accent },
          { label: "Esta semana", value: weekApts, icon: "📅", color: C.info },
          {
            label: "Pendientes / En espera",
            value: pendingApts,
            icon: "⏳",
            color: C.warning,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}
              >
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View content */}
      {view === "Hoy" && <TodayView />}
      {view === "Semana" && <WeekView />}
      {view === "Mes" && <MonthView />}
      {view === "Lista" && <ListView />}
    </div>
  );
}

// ─── PATIENTS PAGE ────────────────────────────────────────────────────────────
function PatientsPage({ pets, vaccines, visits, onSelect, onAdd }) {
  const [search, setSearch] = useState("");
  const filtered = pets.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.owner?.toLowerCase().includes(search.toLowerCase())
  );
  const statusColor = {
    Activo: C.accent,
    Internado: C.danger,
    Seguimiento: C.warning,
  };
  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Pacientes
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            {pets.length} pacientes registrados
          </div>
        </div>
        <button
          onClick={onAdd}
          style={{
            background: C.accent,
            color: "#000",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          + Nuevo Paciente
        </button>
      </div>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
          }}
        >
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o propietario..."
          style={{
            width: "100%",
            padding: "12px 16px 12px 44px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 16,
        }}
      >
        {filtered.map((p, i) => (
          <div
            key={i}
            className="fade-in"
            onClick={() => onSelect(p)}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 20,
              cursor: "pointer",
              transition: "border-color .2s, transform .2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = p.color;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: p.color + "15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  border: `2px solid ${p.color}20`,
                }}
              >
                {p.avatar}
              </div>
              <Badge color={statusColor[p.status]}>{p.status}</Badge>
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{p.name}</div>
            <div style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
              {p.breed} · {p.species}
            </div>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["🎂 Edad", p.age],
                ["⚖️ Peso", p.weight],
                ["👤 Dueño", p.owner],
                ["📅 Visitas", visits.filter((v) => v.petId === p.id).length],
              ].map(([k, v]) => (
                <div key={k}>
                  <div
                    style={{
                      fontSize: 10,
                      color: C.textDim,
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 2,
                      color: C.textMuted,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PATIENT DETAIL ───────────────────────────────────────────────────────────
function PatientDetail({
  pet,
  visits,
  vaccines,
  appointments,
  onBack,
  onAddVisit,
  onAddVaccine,
  onUpdatePet,
  onDelete,
}) {
  const [tab, setTab] = useState("info");
  const [confirm, setConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(pet);
  const tabs = [
    ["info", "ℹ️ Info"],
    ["Consultas", "📋 Consultas"],
    ["vacunas", "💉 Vacunas"],
    ["citas", "📅 Citas"],
  ];
  const handleSaveEdit = () => {
    onUpdatePet(editForm);
    setIsEditing(false);
  };
  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: `1px solid ${C.border}`,
          color: C.textMuted,
          borderRadius: 8,
          padding: "6px 14px",
          cursor: "pointer",
          fontSize: 13,
          width: "fit-content",
          fontWeight: 600,
        }}
      >
        ← Volver
      </button>
      <Card style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: pet.color + "15",
            border: `2px solid ${pet.color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
          }}
        >
          {pet.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {pet.name}
          </div>
          <div style={{ color: C.textMuted, fontSize: 14 }}>
            {pet.breed} · {pet.species}
          </div>
          <div
            style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
          >
            {[
              `🎂 ${pet.age}`,
              `⚖️ ${pet.weight}`,
              `📋 ${visits.length} visitas`,
            ].map((t) => (
              <span
                key={t}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 100,
                  padding: "3px 12px",
                  fontSize: 12,
                  color: C.textMuted,
                  fontWeight: 600,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "none",
              color: tab === key ? "#0f766e" : C.textMuted,
              borderBottom: `2px solid ${
                tab === key ? "#0f766e" : "transparent"
              }`,
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "info" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Datos del paciente
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: C.accent,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  ✏️ Editar
                </button>
              )}
            </div>
            {isEditing ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <Input
                  label="Nombre"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
                <Input
                  label="Especie"
                  value={editForm.species}
                  onChange={(e) =>
                    setEditForm({ ...editForm, species: e.target.value })
                  }
                />
                <Input
                  label="Raza"
                  value={editForm.breed}
                  onChange={(e) =>
                    setEditForm({ ...editForm, breed: e.target.value })
                  }
                />
                <Input
                  label="Color de pelaje"
                  value={editForm.coatColor}
                  onChange={(e) =>
                    setEditForm({ ...editForm, coatColor: e.target.value })
                  }
                />
                <Input
                  label="Edad"
                  value={editForm.age}
                  onChange={(e) =>
                    setEditForm({ ...editForm, age: e.target.value })
                  }
                />
                <Input
                  label="Peso"
                  value={editForm.weight}
                  onChange={(e) =>
                    setEditForm({ ...editForm, weight: e.target.value })
                  }
                />
                <Input
                  label="Estado"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                />
              </div>
            ) : (
              [
                ["Nombre", pet.name],
                ["Especie", pet.species],
                ["Raza", pet.breed],
                ["Color de pelaje", pet.coatColor || "No especificado"],
                ["Edad", pet.age],
                ["Peso", pet.weight],
                ["Estado", pet.status],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                </div>
              ))
            )}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                Propietario
              </div>
              {isEditing ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <Input
                    label="Nombre del Dueño"
                    value={editForm.owner}
                    onChange={(e) =>
                      setEditForm({ ...editForm, owner: e.target.value })
                    }
                  />
                  <Input
                    label="Teléfono"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />
                  <Input
                    label="Correo"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
              ) : (
                [
                  ["Nombre", pet.owner],
                  ["Teléfono", pet.phone || "No registrado"],
                  ["Correo", pet.email || "No registrado"],
                  ["Última visita", pet.lastVisit],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <span style={{ color: C.textMuted, fontSize: 13 }}>
                      {k}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                  </div>
                ))
              )}
              {isEditing && (
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => {
                      setEditForm(pet);
                      setIsEditing(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: C.accent,
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              )}
            </Card>
            <Card>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: C.danger,
                  marginBottom: 10,
                }}
              >
                Zona de peligro
              </div>
              {!confirm ? (
                <button
                  onClick={() => setConfirm(true)}
                  style={{
                    background: C.danger + "15",
                    color: C.danger,
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  🗑 Eliminar paciente
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>
                    ¿Seguro?
                  </span>
                  <button
                    onClick={onDelete}
                    style={{
                      background: C.danger,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Sí, eliminar
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    style={{
                      background: "transparent",
                      color: C.textMuted,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      {tab === "Consultas" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <button
              onClick={onAddVisit}
              style={{
                background: C.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              + Agregar consulta
            </button>
          </div>
          {visits.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: 48, color: C.textMuted }}
            >
              Sin consultas registradas
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: C.border,
                }}
              />
              {[...visits]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((v, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      paddingLeft: 44,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        top: 6,
                        width: 18,
                        height: 18,
                        background: C.accent,
                        borderRadius: "50%",
                        border: `3px solid ${C.surface}`,
                      }}
                    />
                    <Card style={{ padding: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.textMuted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        {v.date}
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        {v.type}
                      </div>
                      {v.diagnosis && (
                        <div style={{ fontSize: 13, color: C.textMuted }}>
                          {v.diagnosis}
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      {tab === "vacunas" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <button
              onClick={onAddVaccine}
              style={{
                background: C.info,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              + Agregar vacuna
            </button>
          </div>
          <Card style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    "Vacuna",
                    "Aplicada",
                    "Próxima dosis",
                    "Lote",
                    "Estado",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "14px 20px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.textMuted,
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vaccines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 32,
                        textAlign: "center",
                        color: C.textMuted,
                      }}
                    >
                      Sin vacunas registradas
                    </td>
                  </tr>
                ) : (
                  vaccines.map((v, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                        💉 {v.name}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: 13,
                          color: C.textMuted,
                        }}
                      >
                        {v.date}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13 }}>
                        {v.nextDue}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: 13,
                          color: C.textMuted,
                        }}
                      >
                        {v.lot || "—"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <Badge
                          color={v.status === "vencida" ? C.danger : C.accent}
                        >
                          {v.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}
      {tab === "citas" && (
        <Card>
          {appointments.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>
              Sin citas programadas
            </div>
          ) : (
            appointments.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom:
                    i < appointments.length - 1
                      ? `1px solid ${C.border}`
                      : "none",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.type}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>
                    {a.date} a las {a.time}
                  </div>
                </div>
                <Badge color={C.accent}>{a.status}</Badge>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

// ─── RECORDS PAGE —  CLÍNICO EDITABLE ───────────────────────────────
function RecordsPage({
  visits,
  pets,
  vaccines,
  results,
  onAddResult,
  onDeleteResult,
  onUpdateVisits,
  onUpdateVaccines,
}) {
  const [search, setSearch] = useState("");
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [addingVisit, setAddingVisit] = useState(false);
  const [addingVaccine, setAddingVaccine] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileInputRef = useRef(null);

  const petsWithRecords = useMemo(() => {
    return pets;
  }, [pets]);

  const filtered = useMemo(() => {
    if (!search) return petsWithRecords;
    const q = search.toLowerCase();
    return petsWithRecords.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.owner?.toLowerCase().includes(q) ||
        p.breed?.toLowerCase().includes(q)
    );
  }, [petsWithRecords, search]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const petVisits = selectedPetId
    ? visits.filter((v) => v.petId === selectedPetId)
    : [];
  const petVaccines = selectedPetId
    ? vaccines.filter((v) => v.petId === selectedPetId)
    : [];
  const petResults = selectedPetId
    ? results.filter((r) => r.petId === selectedPetId)
    : [];

  const surgeries = petVisits.filter(
    (v) =>
      v.type?.toLowerCase().includes("cirugía") ||
      v.type?.toLowerCase().includes("cirugia") ||
      v.type?.toLowerCase().includes("operación") ||
      v.type?.toLowerCase().includes("operacion")
  );
  const treatments = petVisits.filter(
    (v) =>
      v.type?.toLowerCase().includes("tratamiento") ||
      v.type?.toLowerCase().includes("medicamento") ||
      v.type?.toLowerCase().includes("terapia")
  );
  const consultations = petVisits.filter(
    (v) => !surgeries.includes(v) && !treatments.includes(v)
  );

  const handleDeleteVisit = async (visitId) => {
    await onUpdateVisits(visits.filter((v) => v.id !== visitId));
    setDeleteConfirm(null);
  };
  const handleDeleteVaccine = async (vaccineId) => {
    await onUpdateVaccines(vaccines.filter((v) => v.id !== vaccineId));
    setDeleteConfirm(null);
  };
  const handleSaveVisit = async (updatedVisit) => {
    await onUpdateVisits(
      visits.map((v) => (v.id === updatedVisit.id ? updatedVisit : v))
    );
    setEditingVisit(null);
  };
  const handleSaveVaccine = async (updatedVaccine) => {
    await onUpdateVaccines(
      vaccines.map((v) => (v.id === updatedVaccine.id ? updatedVaccine : v))
    );
    setEditingVaccine(null);
  };
  const handleAddNewVisit = async (newVisit) => {
    await onUpdateVisits([newVisit, ...visits]);
    setAddingVisit(false);
  };
  const handleAddNewVaccine = async (newVaccine) => {
    await onUpdateVaccines([newVaccine, ...vaccines]);
    setAddingVaccine(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPetId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onAddResult({
        id: "r_" + uid(),
        petId: selectedPetId,
        fileName: file.name,
        fileType: file.type,
        fileData: event.target.result,
        fileSize:
          file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
            : (file.size / 1024).toFixed(0) + " KB",
        uploadDate: new Date().toISOString().split("T")[0],
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sectionStyle = (color) => ({
    background: color + "06",
    border: `1.5px solid ${color}20`,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  });

  const ItemActions = ({ onEdit, id }) => (
    <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
      <button
        onClick={onEdit}
        style={{
          background: C.info + "15",
          border: `1px solid ${C.info}30`,
          borderRadius: 7,
          padding: "4px 10px",
          cursor: "pointer",
          fontSize: 12,
          color: C.info,
          fontWeight: 600,
        }}
      >
        ✏️ Editar
      </button>
      <button
        onClick={() => setDeleteConfirm(id)}
        style={{
          background: C.danger + "10",
          border: `1px solid ${C.danger}25`,
          borderRadius: 7,
          padding: "4px 10px",
          cursor: "pointer",
          fontSize: 12,
          color: C.danger,
          fontWeight: 600,
        }}
      >
        🗑
      </button>
    </div>
  );

  return (
    <div
      className="fade-in"
      style={{ display: "flex", gap: 24, height: "calc(100vh - 64px)" }}
    >
      {/* Edit modals */}
      {editingVisit && (
        <EditVisitModal
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSave={handleSaveVisit}
        />
      )}
      {editingVaccine && (
        <EditVaccineModal
          vaccine={editingVaccine}
          onClose={() => setEditingVaccine(null)}
          onSave={handleSaveVaccine}
        />
      )}
      {addingVisit && selectedPet && (
        <NewVisitModal
          pet={selectedPet}
          onClose={() => setAddingVisit(false)}
          onSave={handleAddNewVisit}
        />
      )}
      {addingVaccine && selectedPet && (
        <NewVaccineModal
          pet={selectedPet}
          onClose={() => setAddingVaccine(false)}
          onSave={handleAddNewVaccine}
        />
      )}
      {deleteConfirm && (
        <ModalWrap
          title="⚠️ Confirmar eliminación"
          onClose={() => setDeleteConfirm(null)}
        >
          <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
            ¿Estás seguro de que deseas eliminar este registro? Esta acción no
            se puede deshacer.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{
                flex: 1,
                padding: 11,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textMuted,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const isVaccine = deleteConfirm.startsWith("vc_");
                isVaccine
                  ? handleDeleteVaccine(deleteConfirm)
                  : handleDeleteVisit(deleteConfirm);
              }}
              style={{
                flex: 1,
                padding: 11,
                background: C.danger,
                border: "none",
                color: "#fff",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Sí, eliminar
            </button>
          </div>
        </ModalWrap>
      )}

      {/* ── LEFT: pet list ── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Historial Clínico
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.textMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          {filtered.length} paciente{filtered.length !== 1 ? "s" : ""}
        </div>
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: C.textMuted,
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
              Sin pacientes registrados aún.
            </div>
          )}
          {filtered.map((p) => {
            const vCount = visits.filter((v) => v.petId === p.id).length;
            const vacCount = vaccines.filter((v) => v.petId === p.id).length;
            const isSelected = selectedPetId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPetId(isSelected ? null : p.id)}
                style={{
                  background: isSelected ? p.color + "12" : C.surface,
                  border: `1.5px solid ${isSelected ? p.color : C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.borderColor = p.color + "80";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = C.border;
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: p.color + "20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {p.owner}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      background: C.info + "15",
                      color: C.info,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontWeight: 600,
                    }}
                  >
                    📋 {vCount} visita{vCount !== 1 ? "s" : ""}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      background: C.accent + "15",
                      color: "#0f766e",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontWeight: 600,
                    }}
                  >
                    💉 {vacCount} vacuna{vacCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: medical file ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selectedPet ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: C.textMuted,
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Selecciona un paciente
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              para ver su ficha médica completa
            </div>
          </div>
        ) : (
          <div className="fade-in">
            {/* Header */}
            <Card
              style={{
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: selectedPet.color + "15",
                  border: `2px solid ${selectedPet.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 38,
                }}
              >
                {selectedPet.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {selectedPet.name}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  {selectedPet.breed} · {selectedPet.species} ·{" "}
                  {selectedPet.age} · {selectedPet.weight}
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                  Dueño: <strong>{selectedPet.owner}</strong> · 📞{" "}
                  {selectedPet.phone || "—"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "flex-end",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: C.info }}>
                  📋 {petVisits.length} visitas
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#0f766e" }}
                >
                  💉 {petVaccines.length} vacunas
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: C.purple }}
                >
                  📁 {petResults.length} documentos
                </span>
              </div>
            </Card>

            {/* ── VACUNACIÓN ── */}
            <div style={sectionStyle(C.accent)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>💉</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Vacunación</div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  {petVaccines.length} registro
                  {petVaccines.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setAddingVaccine(true)}
                  style={{
                    background: C.accent,
                    color: "#000",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  + Agregar
                </button>
              </div>
              {petVaccines.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: "center",
                    padding: "12px 0",
                  }}
                >
                  Sin vacunas registradas. Haz clic en "+ Agregar" para
                  registrar la primera.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[...petVaccines]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((v, i) => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "12px 16px",
                          border: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              marginBottom: 4,
                            }}
                          >
                            {v.name}
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>
                            Aplicada: <strong>{v.date}</strong> · Próxima dosis:{" "}
                            <strong>{v.nextDue}</strong>
                            {v.lot ? ` · Lote: ${v.lot}` : ""}
                          </div>
                          {v.notes && (
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textMuted,
                                marginTop: 4,
                                fontStyle: "italic",
                              }}
                            >
                              📝 {v.notes}
                            </div>
                          )}
                        </div>
                        <Badge
                          color={v.status === "vencida" ? C.danger : C.accent}
                        >
                          {v.status}
                        </Badge>
                        <ItemActions
                          onEdit={() => setEditingVaccine(v)}
                          id={v.id}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── TRATAMIENTOS ── */}
            <div style={sectionStyle(C.info)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>💊</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Tratamientos
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  {treatments.length} registro
                  {treatments.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setAddingVisit(true)}
                  style={{
                    background: C.info,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  + Agregar
                </button>
              </div>
              {treatments.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: "center",
                    padding: "12px 0",
                  }}
                >
                  Sin tratamientos registrados.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[...treatments]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((v, i) => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "14px 16px",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Badge color={C.info}>{v.type}</Badge>
                          <span
                            style={{
                              fontSize: 12,
                              color: C.textMuted,
                              fontWeight: 700,
                              marginLeft: 4,
                            }}
                          >
                            📅 {v.date}
                          </span>
                          <ItemActions
                            onEdit={() => setEditingVisit(v)}
                            id={v.id}
                          />
                        </div>
                        {v.startDate && v.startDate !== v.date && (
                          <div
                            style={{
                              fontSize: 12,
                              color: C.info,
                              fontWeight: 600,
                              marginBottom: 6,
                            }}
                          >
                            🗓 Inicio del tratamiento: {v.startDate}
                          </div>
                        )}
                        {v.diagnosis && (
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              lineHeight: 1.5,
                              marginBottom: v.medications || v.details ? 8 : 0,
                            }}
                          >
                            <span
                              style={{ fontWeight: 600, color: C.textMuted }}
                            >
                              Diagnóstico:{" "}
                            </span>
                            {v.diagnosis}
                          </div>
                        )}
                        {v.medications && (
                          <div
                            style={{
                              background: C.info + "08",
                              border: `1px solid ${C.info}20`,
                              borderRadius: 8,
                              padding: "8px 12px",
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.info,
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: 3,
                              }}
                            >
                              💊 Medicamentos
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: C.text,
                                lineHeight: 1.5,
                              }}
                            >
                              {v.medications}
                            </div>
                          </div>
                        )}
                        {v.details && (
                          <div
                            style={{
                              background: C.warning + "08",
                              border: `1px solid ${C.warning}20`,
                              borderRadius: 8,
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.warning,
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: 3,
                              }}
                            >
                              📌 Detalles importantes
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: C.text,
                                lineHeight: 1.5,
                              }}
                            >
                              {v.details}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── CIRUGÍAS ── */}
            <div style={sectionStyle(C.danger)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>🔬</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Cirugías</div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  {surgeries.length} registro{surgeries.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setAddingVisit(true)}
                  style={{
                    background: C.danger,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  + Agregar
                </button>
              </div>
              {surgeries.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: "center",
                    padding: "12px 0",
                  }}
                >
                  Sin cirugías registradas.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[...surgeries]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((v, i) => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "14px 16px",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Badge color={C.danger}>{v.type}</Badge>
                          <span
                            style={{
                              fontSize: 12,
                              color: C.textMuted,
                              fontWeight: 700,
                              marginLeft: 4,
                            }}
                          >
                            📅 {v.date}
                          </span>
                          <ItemActions
                            onEdit={() => setEditingVisit(v)}
                            id={v.id}
                          />
                        </div>
                        {v.diagnosis && (
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              lineHeight: 1.5,
                              marginBottom:
                                v.preopNotes || v.postopNotes ? 8 : 0,
                            }}
                          >
                            <span
                              style={{ fontWeight: 600, color: C.textMuted }}
                            >
                              Procedimiento:{" "}
                            </span>
                            {v.diagnosis}
                          </div>
                        )}
                        {v.preopNotes && (
                          <div
                            style={{
                              background: C.warning + "08",
                              border: `1px solid ${C.warning}20`,
                              borderRadius: 8,
                              padding: "8px 12px",
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.warning,
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: 3,
                              }}
                            >
                              📋 Pre-operatorio
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: C.text,
                                lineHeight: 1.5,
                              }}
                            >
                              {v.preopNotes}
                            </div>
                          </div>
                        )}
                        {v.postopNotes && (
                          <div
                            style={{
                              background: C.accent + "08",
                              border: `1px solid ${C.accent}20`,
                              borderRadius: 8,
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#0f766e",
                                textTransform: "uppercase",
                                letterSpacing: ".5px",
                                marginBottom: 3,
                              }}
                            >
                              ✅ Post-operatorio
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: C.text,
                                lineHeight: 1.5,
                              }}
                            >
                              {v.postopNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── CONSULTAS GENERALES ── */}
            <div style={sectionStyle(C.purple)}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>📋</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Consultas generales
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  {consultations.length} registro
                  {consultations.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setAddingVisit(true)}
                  style={{
                    background: C.purple,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  + Agregar
                </button>
              </div>
              {consultations.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: "center",
                    padding: "12px 0",
                  }}
                >
                  Sin consultas generales.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[...consultations]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((v, i) => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "14px 16px",
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: v.diagnosis ? 8 : 0,
                          }}
                        >
                          <Badge color={C.purple}>{v.type}</Badge>
                          <span
                            style={{
                              fontSize: 12,
                              color: C.textMuted,
                              fontWeight: 700,
                              marginLeft: 4,
                            }}
                          >
                            📅 {v.date}
                          </span>
                          <ItemActions
                            onEdit={() => setEditingVisit(v)}
                            id={v.id}
                          />
                        </div>
                        {v.diagnosis && (
                          <div
                            style={{
                              fontSize: 13,
                              color: C.text,
                              lineHeight: 1.5,
                            }}
                          >
                            {v.diagnosis}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── RESULTADOS DE EXÁMENES ── */}
            <div style={sectionStyle("#6B7280")}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 20 }}>📁</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Resultados de Exámenes
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: C.textMuted,
                  }}
                >
                  {petResults.length} documento
                  {petResults.length !== 1 ? "s" : ""}
                </span>
                <label
                  style={{
                    background: "#1E293B",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-block",
                  }}
                >
                  + Subir documento
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <div
                style={{
                  background: "#F8FAFC",
                  border: `1px dashed #CBD5E1`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 12,
                  fontSize: 12,
                  color: C.textMuted,
                }}
              >
                💡 Acepta PDF, JPG, PNG. Los documentos se guardan durante la
                sesión activa.
              </div>
              {petResults.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.textMuted,
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  Sin documentos subidos. Carga PDFs o imágenes de resultados de
                  exámenes.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {petResults.map((r, i) => {
                    const isPdf = r.fileType === "application/pdf";
                    const isImage = r.fileType?.startsWith("image/");
                    return (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "12px 16px",
                          border: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: isPdf ? "#FF4D6D15" : "#4DA6FF15",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            flexShrink: 0,
                          }}
                        >
                          {isPdf ? "📄" : isImage ? "🖼️" : "📎"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.fileName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.textMuted,
                              marginTop: 2,
                            }}
                          >
                            Subido: {r.uploadDate} · {r.fileSize}
                          </div>
                        </div>
                        {isImage && (
                          <img
                            src={r.fileData}
                            alt={r.fileName}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: `1px solid ${C.border}`,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <a
                          href={r.fileData}
                          download={r.fileName}
                          style={{
                            background: C.info + "15",
                            color: C.info,
                            border: `1px solid ${C.info}30`,
                            borderRadius: 8,
                            padding: "5px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                            flexShrink: 0,
                          }}
                        >
                          ⬇ Descargar
                        </a>
                        <button
                          onClick={() => onDeleteResult(r.id)}
                          style={{
                            background: C.danger + "10",
                            border: `1px solid ${C.danger}25`,
                            borderRadius: 8,
                            padding: "5px 8px",
                            cursor: "pointer",
                            fontSize: 13,
                            color: C.danger,
                            flexShrink: 0,
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EDIT VISIT MODAL ─────────────────────────────────────────────────────────
function EditVisitModal({ visit, onClose, onSave }) {
  const [form, setForm] = useState({
    ...visit,
    startDate: visit.startDate || visit.date,
    medications: visit.medications || "",
    details: visit.details || "",
    preopNotes: visit.preopNotes || "",
    postopNotes: visit.postopNotes || "",
  });

  const isTreatment =
    form.type?.toLowerCase().includes("tratamiento") ||
    form.type?.toLowerCase().includes("medicamento") ||
    form.type?.toLowerCase().includes("terapia");
  const isSurgery =
    form.type?.toLowerCase().includes("cirugía") ||
    form.type?.toLowerCase().includes("cirugia") ||
    form.type?.toLowerCase().includes("operación") ||
    form.type?.toLowerCase().includes("operacion");

  const TextArea = ({ label, field, placeholder, rows = 2 }) => (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.textMuted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: ".5px",
        }}
      >
        {label}
      </div>
      <textarea
        value={form[field]}
        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        rows={rows}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontSize: 14,
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
    </div>
  );

  return (
    <ModalWrap title="✏️ Editar Registro Médico" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Fecha"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="Tipo de consulta"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          placeholder="Ej: Tratamiento, Cirugía..."
        />
      </div>

      {isTreatment && (
        <Input
          label="🗓 Inicio del tratamiento"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
        />
      )}

      <TextArea
        label="Diagnóstico / Notas"
        field="diagnosis"
        placeholder="Observaciones del veterinario..."
        rows={3}
      />

      {isTreatment && (
        <>
          <TextArea
            label="💊 Medicamentos prescritos"
            field="medications"
            placeholder="Ej: Amoxicilina 250mg c/8h x 7 días, Ibuprofeno..."
          />
          <TextArea
            label="📌 Detalles importantes"
            field="details"
            placeholder="Indicaciones especiales, reacciones, observaciones del tratamiento..."
            rows={3}
          />
        </>
      )}

      {isSurgery && (
        <>
          <TextArea
            label="📋 Notas pre-operatorias"
            field="preopNotes"
            placeholder="Preparación, ayuno, medicación previa..."
          />
          <TextArea
            label="✅ Notas post-operatorias"
            field="postopNotes"
            placeholder="Recuperación, cuidados, medicación posterior..."
          />
        </>
      )}

      {!isTreatment && !isSurgery && (
        <TextArea
          label="📝 Observaciones adicionales"
          field="details"
          placeholder="Detalles adicionales de la consulta..."
          rows={2}
        />
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Guardar cambios
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── EDIT VACCINE MODAL ───────────────────────────────────────────────────────
function EditVaccineModal({ vaccine, onClose, onSave }) {
  const [form, setForm] = useState({ ...vaccine, notes: vaccine.notes || "" });
  return (
    <ModalWrap title="✏️ Editar Vacuna" onClose={onClose}>
      <Input
        label="Nombre de la vacuna *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Ej: Triple Felina, Antirrábica..."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Fecha de aplicación"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="Próxima dosis"
          type="date"
          value={form.nextDue}
          onChange={(e) => setForm({ ...form, nextDue: e.target.value })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Lote (Opcional)"
          value={form.lot}
          onChange={(e) => setForm({ ...form, lot: e.target.value })}
          placeholder="Ej: L-12345"
        />
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.textMuted,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".5px",
            }}
          >
            Estado
          </div>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="vigente">Vigente</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Notas adicionales
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Observaciones sobre la vacuna..."
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.name}
          onClick={() => onSave(form)}
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.name ? 0.5 : 1,
          }}
        >
          Guardar cambios
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── INVENTARIO MÉDICO ────────────────────────────────────────────────────────
function InventarioPage({ inventory, onUpdate }) {
  const CATEGORIES = [
    "Vacunas",
    "Pipetas",
    "Medicamentos",
    "Antisépticos",
    "Material Quirúrgico",
    "Otros",
  ];
  const CAT_ICON = {
    Vacunas: "💉",
    Pipetas: "🧪",
    Medicamentos: "💊",
    Antisépticos: "🧴",
    "Material Quirúrgico": "🔬",
    Otros: "📦",
  };
  const CAT_COLOR = {
    Vacunas: C.accent,
    Pipetas: C.info,
    Medicamentos: C.purple,
    Antisépticos: C.warning,
    "Material Quirúrgico": C.danger,
    Otros: C.textMuted,
  };

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const emptyForm = {
    name: "",
    category: "Medicamentos",
    quantity: "",
    unit: "unidades",
    minStock: "",
    expiryDate: "",
    notes: "",
    price: "",
  };
  const [form, setForm] = useState(emptyForm);

  const filtered = inventory.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      item.name?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q);
    const matchCat = catFilter === "Todos" || item.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowStock = inventory.filter(
    (item) =>
      item.minStock && parseInt(item.quantity) <= parseInt(item.minStock)
  );
  const expiredItems = inventory.filter(
    (item) => item.expiryDate && new Date(item.expiryDate) < new Date()
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name || !form.quantity) return;
    if (editItem) {
      await onUpdate(
        inventory.map((i) =>
          i.id === editItem.id ? { ...editItem, ...form } : i
        )
      );
    } else {
      await onUpdate([{ ...form, id: "inv_" + uid() }, ...inventory]);
    }
    setShowModal(false);
    setEditItem(null);
  };
  const handleDelete = async (id) => {
    await onUpdate(inventory.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };
  const adjustQty = async (item, delta) => {
    const newQty = Math.max(0, parseInt(item.quantity || 0) + delta);
    await onUpdate(
      inventory.map((i) =>
        i.id === item.id ? { ...i, quantity: String(newQty) } : i
      )
    );
  };

  const catStats = CATEGORIES.map((c) => ({
    cat: c,
    count: inventory.filter((i) => i.category === c).length,
  })).filter((s) => s.count > 0);

  return (
    <div
      className="fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Add/Edit Modal */}
      {showModal && (
        <ModalWrap
          title={editItem ? "✏️ Editar Producto" : "📦 Agregar Producto"}
          onClose={() => setShowModal(false)}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Input
              label="Nombre del producto *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Amoxicilina 500mg"
            />
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textMuted,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                }}
              >
                Categoría
              </div>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <Input
              label="Cantidad *"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Unidad"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="unidades, ml, g..."
            />
            <Input
              label="Stock mínimo"
              type="number"
              min="0"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              placeholder="5"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
            <Input
              label="Precio unitario (S/)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.textMuted,
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Notas / Proveedor
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Proveedor, indicaciones, ubicación en almacén..."
              style={{
                width: "100%",
                padding: "10px 14px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setShowModal(false)}
              style={{
                flex: 1,
                padding: 11,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textMuted,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>
            <button
              disabled={!form.name || !form.quantity}
              onClick={handleSave}
              style={{
                flex: 1,
                padding: 11,
                background: C.accent,
                border: "none",
                color: "#000",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
                opacity: !form.name || !form.quantity ? 0.5 : 1,
              }}
            >
              {editItem ? "Actualizar" : "Agregar producto"}
            </button>
          </div>
        </ModalWrap>
      )}
      {deleteConfirm && (
        <ModalWrap
          title="⚠️ Confirmar eliminación"
          onClose={() => setDeleteConfirm(null)}
        >
          <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 20 }}>
            ¿Eliminar este producto del inventario?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setDeleteConfirm(null)}
              style={{
                flex: 1,
                padding: 11,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textMuted,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              style={{
                flex: 1,
                padding: 11,
                background: C.danger,
                border: "none",
                color: "#fff",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Eliminar
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Inventario Médico
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            {inventory.length} productos · {lowStock.length} con stock bajo ·{" "}
            {expiredItems.length} vencidos
          </div>
        </div>
        <button
          onClick={openAdd}
          style={{
            background: C.accent,
            color: "#000",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          + Agregar producto
        </button>
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || expiredItems.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              lowStock.length > 0 && expiredItems.length > 0
                ? "1fr 1fr"
                : "1fr",
            gap: 12,
          }}
        >
          {lowStock.length > 0 && (
            <div
              style={{
                background: C.warning + "12",
                border: `1.5px solid ${C.warning}30`,
                borderRadius: 12,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.warning,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                ⚠️ Stock Bajo ({lowStock.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {lowStock.map((item) => (
                  <span
                    key={item.id}
                    style={{
                      background: C.warning + "20",
                      color: "#92400e",
                      borderRadius: 8,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.name}: {item.quantity} {item.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
          {expiredItems.length > 0 && (
            <div
              style={{
                background: C.danger + "10",
                border: `1.5px solid ${C.danger}25`,
                borderRadius: 12,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.danger,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                🚫 Productos Vencidos ({expiredItems.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {expiredItems.map((item) => (
                  <span
                    key={item.id}
                    style={{
                      background: C.danger + "15",
                      color: C.danger,
                      borderRadius: 8,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.name} — {item.expiryDate}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category quick stats */}
      {catStats.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {catStats.map(({ cat, count }) => (
            <div
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? "Todos" : cat)}
              style={{
                background:
                  catFilter === cat ? CAT_COLOR[cat] + "20" : C.surface,
                border: `1.5px solid ${
                  catFilter === cat ? CAT_COLOR[cat] : C.border
                }`,
                borderRadius: 10,
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 18 }}>{CAT_ICON[cat]}</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: CAT_COLOR[cat],
                  }}
                >
                  {count}
                </div>
                <div
                  style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}
                >
                  {cat}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría..."
            style={{
              width: "100%",
              padding: "10px 16px 10px 38px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todos", ...CATEGORIES].map((f) => (
            <button
              key={f}
              onClick={() => setCatFilter(f)}
              style={{
                background: catFilter === f ? "#1E293B" : C.surface,
                color: catFilter === f ? "#fff" : C.textMuted,
                border: `1px solid ${catFilter === f ? "#1E293B" : C.border}`,
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {f === "Todos" ? "🗂 Todos" : `${CAT_ICON[f]} ${f}`}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            Inventario vacío
          </div>
          <div style={{ fontSize: 13 }}>
            {inventory.length === 0
              ? "Agrega tu primer producto usando el botón de arriba."
              : "No hay productos que coincidan con tu búsqueda."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((item) => {
            const isLow =
              item.minStock &&
              parseInt(item.quantity) <= parseInt(item.minStock);
            const isExpired =
              item.expiryDate && new Date(item.expiryDate) < new Date();
            const color = CAT_COLOR[item.category] || C.textMuted;
            const qty = parseInt(item.quantity) || 0;
            const minQty = parseInt(item.minStock) || 0;
            const pct =
              minQty > 0 ? Math.min(100, (qty / (minQty * 2)) * 100) : null;

            return (
              <div
                key={item.id}
                style={{
                  background: C.surface,
                  border: `1.5px solid ${
                    isLow || isExpired ? C.danger + "35" : C.border
                  }`,
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Top row */}
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: color + "18",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {CAT_ICON[item.category] || "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <Badge color={color}>{item.category}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(item)}
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 7,
                        padding: "4px 9px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.textMuted,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      style={{
                        background: C.danger + "10",
                        border: `1px solid ${C.danger}25`,
                        borderRadius: 7,
                        padding: "4px 9px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.danger,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Stock control */}
                <div
                  style={{
                    background: isLow
                      ? C.warning + "10"
                      : isExpired
                      ? C.danger + "08"
                      : C.bg,
                    borderRadius: 10,
                    padding: "10px 14px",
                    border: `1px solid ${isLow ? C.warning + "30" : C.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                        fontWeight: 600,
                      }}
                    >
                      Stock actual
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <button
                        onClick={() => adjustQty(item, -1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.danger,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          color: isLow ? C.warning : color,
                          minWidth: 40,
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => adjustQty(item, 1)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        {item.unit}
                      </span>
                    </div>
                  </div>
                  {pct !== null && (
                    <div
                      style={{
                        background: C.border,
                        borderRadius: 100,
                        height: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: isLow ? C.warning : color,
                          borderRadius: 100,
                          transition: "width .3s",
                        }}
                      />
                    </div>
                  )}
                  {item.minStock && (
                    <div
                      style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}
                    >
                      Mínimo: {item.minStock} {item.unit}
                    </div>
                  )}
                </div>

                {/* Meta info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  {item.expiryDate && (
                    <div
                      style={{
                        background: C.bg,
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: `1px solid ${
                          isExpired ? C.danger + "30" : C.border
                        }`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textDim,
                          fontWeight: 600,
                        }}
                      >
                        📅 Vence
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isExpired ? C.danger : C.text,
                          marginTop: 2,
                        }}
                      >
                        {item.expiryDate}
                      </div>
                    </div>
                  )}
                  {item.price && (
                    <div
                      style={{
                        background: C.bg,
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textDim,
                          fontWeight: 600,
                        }}
                      >
                        💰 Precio unit.
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.text,
                          marginTop: 2,
                        }}
                      >
                        S/ {item.price}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alerts row */}
                {(isLow || isExpired) && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {isLow && (
                      <span
                        style={{
                          background: C.warning + "18",
                          color: "#92400e",
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ Stock bajo
                      </span>
                    )}
                    {isExpired && (
                      <span
                        style={{
                          background: C.danger + "15",
                          color: C.danger,
                          borderRadius: 6,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        🚫 Vencido
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      fontStyle: "italic",
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: 10,
                    }}
                  >
                    📝 {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function ModalWrap({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,43,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 32,
          width: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "fadeIn .3s ease",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
              color: C.textMuted,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NewAppointmentModal({ pets, prefill, onClose, onSave }) {
  const [form, setForm] = useState({
    date: prefill?.date || new Date().toISOString().split("T")[0],
    time: prefill?.time || "",
    petName: "",
    typeSelect: "Chequeo",
    typeOther: "",
    diagnosis: "",
    notes: "",
    status: "Pendiente",
  });
  const matchedPet = pets.find(
    (p) => p.name.toLowerCase() === form.petName.toLowerCase()
  );
  return (
    <ModalWrap title="Nueva Cita" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Fecha"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="Hora"
          type="time"
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Nombre del Paciente
        </div>
        <input
          list="pets-list"
          value={form.petName}
          onChange={(e) => setForm({ ...form, petName: e.target.value })}
          placeholder="Escribe el nombre del paciente..."
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <datalist id="pets-list">
          {pets.map((p) => (
            <option key={p.id} value={p.name}>
              {p.owner}
            </option>
          ))}
        </datalist>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Tipo de consulta
        </div>
        <select
          value={form.typeSelect}
          onChange={(e) => setForm({ ...form, typeSelect: e.target.value })}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
          }}
        >
          {[
            "Baño",
            "Vacunación",
            "Tratamiento",
            "Cirugía",
            "Chequeo",
            "Otro",
          ].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      {form.typeSelect === "Otro" && (
        <Input
          label="Especificar Tipo"
          value={form.typeOther}
          onChange={(e) => setForm({ ...form, typeOther: e.target.value })}
          placeholder="Especifique el tipo..."
        />
      )}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Diagnóstico / Tratamiento
        </div>
        <textarea
          value={form.diagnosis}
          onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
          rows={2}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>
      <Input
        label="Nota adicional"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Escribe aquí..."
      />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.petName || !form.time || !form.date}
          onClick={() =>
            onSave({
              id: "a_" + uid(),
              date: form.date,
              time: form.time,
              petId: matchedPet ? matchedPet.id : "new",
              pet: form.petName,
              owner: matchedPet ? matchedPet.owner : "Por definir",
              type:
                form.typeSelect === "Otro" ? form.typeOther : form.typeSelect,
              diagnosis: form.diagnosis,
              notes: form.notes,
              status: "Pendiente",
              avatar: matchedPet ? matchedPet.avatar : "🐾",
            })
          }
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.petName || !form.time || !form.date ? 0.5 : 1,
          }}
        >
          Guardar Cita
        </button>
      </div>
    </ModalWrap>
  );
}

function NewPatientModal({ onClose, onSave }) {
  const SPECIES = {
    Canino: "🐶",
    Felino: "🐱",
    Ave: "🦜",
    Conejo: "🐇",
    Otro: "🐾",
  };
  const COLORS_PET = ["#9B72FF", "#FFB347", "#4DA6FF", "#00D4A0", "#FF4D6D"];
  const [form, setForm] = useState({
    name: "",
    owner: "",
    phone: "",
    email: "",
    species: "Canino",
    breed: "",
    coatColor: "",
    age: "",
    weight: "",
    status: "Activo",
  });
  return (
    <ModalWrap title="Nuevo Paciente" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Nombre *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Luna"
        />
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.textMuted,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".5px",
            }}
          >
            Especie
          </div>
          <select
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontSize: 14,
              outline: "none",
            }}
          >
            {Object.keys(SPECIES).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Raza"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          placeholder="Ej: Labrador"
        />
        <Input
          label="Color de pelaje"
          value={form.coatColor}
          onChange={(e) => setForm({ ...form, coatColor: e.target.value })}
          placeholder="Ej: Blanco"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Edad"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          placeholder="Ej: 3 años"
        />
        <Input
          label="Peso"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: e.target.value })}
          placeholder="Ej: 8kg"
        />
      </div>
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          paddingTop: 16,
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        <Input
          label="Propietario *"
          value={form.owner}
          onChange={(e) => setForm({ ...form, owner: e.target.value })}
          placeholder="Nombre completo"
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Input
            label="Teléfono *"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Ej: 987654321"
          />
          <Input
            label="Correo (Opcional)"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ejemplo@mail.com"
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.name || !form.owner || !form.phone}
          onClick={() =>
            onSave({
              ...form,
              id: "p_" + uid(),
              avatar: SPECIES[form.species] || "🐾",
              color: COLORS_PET[Math.floor(Math.random() * COLORS_PET.length)],
              lastVisit: new Date().toISOString().split("T")[0],
            })
          }
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.name || !form.owner || !form.phone ? 0.5 : 1,
          }}
        >
          Registrar Paciente
        </button>
      </div>
    </ModalWrap>
  );
}

function NewVisitModal({ pet, onClose, onSave }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "",
    diagnosis: "",
  });
  return (
    <ModalWrap title={`Nueva Consulta — ${pet.name}`} onClose={onClose}>
      <Input
        label="Fecha"
        type="date"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
      <Input
        label="Tipo de consulta *"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
        placeholder="Ej: Control, Urgencia, Tratamiento, Cirugía..."
      />
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.textMuted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: ".5px",
          }}
        >
          Diagnóstico / Notas
        </div>
        <textarea
          value={form.diagnosis}
          onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
          placeholder="Observaciones del veterinario..."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.type}
          onClick={() =>
            onSave({ ...form, id: "v_" + uid(), petId: pet.id, icon: "📋" })
          }
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.type ? 0.5 : 1,
          }}
        >
          Guardar Consulta
        </button>
      </div>
    </ModalWrap>
  );
}

function NewVaccineModal({ pet, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    date: new Date().toISOString().split("T")[0],
    nextDue: "",
    lot: "",
    status: "vigente",
  });
  return (
    <ModalWrap title={`Agregar Vacuna — ${pet.name}`} onClose={onClose}>
      <Input
        label="Nombre de la vacuna *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Ej: Triple Felina, Antirrábica..."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Fecha de aplicación"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="Próxima dosis *"
          type="date"
          value={form.nextDue}
          onChange={(e) => setForm({ ...form, nextDue: e.target.value })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Lote (Opcional)"
          value={form.lot}
          onChange={(e) => setForm({ ...form, lot: e.target.value })}
          placeholder="Ej: L-12345"
        />
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.textMuted,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".5px",
            }}
          >
            Estado
          </div>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.text,
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="vigente">Vigente</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: 11,
            background: "transparent",
            border: `1px solid ${C.border}`,
            color: C.textMuted,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Cancelar
        </button>
        <button
          disabled={!form.name || !form.nextDue}
          onClick={() => onSave({ ...form, id: "vc_" + uid(), petId: pet.id })}
          style={{
            flex: 1,
            padding: 11,
            background: C.accent,
            border: "none",
            color: "#000",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            opacity: !form.name || !form.nextDue ? 0.5 : 1,
          }}
        >
          Guardar Vacuna
        </button>
      </div>
    </ModalWrap>
  );
}
