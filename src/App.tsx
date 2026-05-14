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

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

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
    const payload = {
      access_key: "3285c47e-869f-4c14-925b-8a070ddc7432",
      subject: "🐾 Nueva veterinaria registrada en VetCare MVP",
      from_name: "VetCare MVP",
      replyto: email,
      message: `Nueva veterinaria registrada:\n\nNombre: ${name}\nClínica: ${clinic}\nCorreo: ${email}\nFecha: ${new Date().toLocaleString(
        "es-ES"
      )}`,
    };
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.success) console.log("✅ Notificación enviada");
    else console.warn("⚠️ Web3Forms error:", JSON.stringify(data));
  } catch (e) {
    console.error("❌ Error Web3Forms:", e);
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
  @keyframes fadeInScale{from{opacity:0;transform:scale(0.92) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}
  @keyframes floatDog{0%,100%{transform:translateY(0px);}50%{transform:translateY(-8px);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
  @keyframes ripple{0%{transform:scale(0);opacity:0.6;}100%{transform:scale(2.5);opacity:0;}}
  @keyframes slideUp{from{opacity:0;transform:translateY(100%);}to{opacity:1;transform:translateY(0);}}
  .fade-in{animation:fadeIn .35s ease forwards;}
  .badge-pulse{animation:pulse 2s infinite;}
  .spinner{width:20px;height:20px;border:2px solid ${C.border};border-top-color:${C.accent};border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
  .float-dog{animation:floatDog 3s ease-in-out infinite;}
  @media(max-width:767px){
    .desktop-only{display:none!important;}
    .mobile-bottom-nav{display:flex!important;}
  }
  @media(min-width:768px){
    .mobile-only{display:none!important;}
    .mobile-bottom-nav{display:none!important;}
  }
`;

// ─── PAWI DOG SVG ─────────────────────────────────────────────────────────────
function PawiDogIllustration({ size = 200 }) {
  return (
    <svg
      viewBox="0 0 260 260"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size, display: "block", margin: "0 auto" }}
    >
      <ellipse
        cx="130"
        cy="248"
        rx="56"
        ry="10"
        fill="#00C49A"
        opacity="0.18"
      />
      <ellipse cx="130" cy="188" rx="52" ry="42" fill="url(#bodyGrad)" />
      <defs>
        <radialGradient id="bodyGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F5D5A8" />
          <stop offset="100%" stopColor="#E8B87A" />
        </radialGradient>
        <radialGradient id="headGrad" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#F7DEB5" />
          <stop offset="100%" stopColor="#E8B87A" />
        </radialGradient>
        <radialGradient id="earGrad" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#D4956B" />
          <stop offset="100%" stopColor="#B8744A" />
        </radialGradient>
        <radialGradient id="snoutGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FBF0E0" />
          <stop offset="100%" stopColor="#F0D8B0" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor="#00A87A"
            floodOpacity="0.2"
          />
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse
        cx="89"
        cy="104"
        rx="20"
        ry="30"
        fill="url(#earGrad)"
        transform="rotate(-18 89 104)"
      />
      <ellipse
        cx="89"
        cy="108"
        rx="12"
        ry="22"
        fill="#C4845A"
        opacity="0.4"
        transform="rotate(-18 89 108)"
      />
      <ellipse
        cx="171"
        cy="104"
        rx="20"
        ry="30"
        fill="url(#earGrad)"
        transform="rotate(18 171 104)"
      />
      <ellipse
        cx="171"
        cy="108"
        rx="12"
        ry="22"
        fill="#C4845A"
        opacity="0.4"
        transform="rotate(18 171 108)"
      />
      <path
        d="M 85 96 Q 130 52 175 96"
        stroke="#1E293B"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 85 96 Q 130 52 175 96"
        stroke="#334155"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <rect x="72" y="92" width="22" height="26" rx="11" fill="#00C49A" />
      <rect x="75" y="95" width="16" height="20" rx="8" fill="#00E5B0" />
      <rect
        x="78"
        y="98"
        width="10"
        height="14"
        rx="5"
        fill="#1E293B"
        opacity="0.15"
      />
      <rect x="166" y="92" width="22" height="26" rx="11" fill="#00C49A" />
      <rect x="169" y="95" width="16" height="20" rx="8" fill="#00E5B0" />
      <rect
        x="172"
        y="98"
        width="10"
        height="14"
        rx="5"
        fill="#1E293B"
        opacity="0.15"
      />
      <circle
        cx="130"
        cy="118"
        r="52"
        fill="url(#headGrad)"
        filter="url(#softShadow)"
      />
      <ellipse
        cx="116"
        cy="96"
        rx="18"
        ry="12"
        fill="white"
        opacity="0.22"
        transform="rotate(-15 116 96)"
      />
      <ellipse cx="130" cy="136" rx="26" ry="20" fill="url(#snoutGrad)" />
      <ellipse cx="130" cy="136" rx="22" ry="16" fill="#FDF5E6" opacity="0.6" />
      <ellipse cx="130" cy="128" rx="10" ry="7" fill="#2D1B0E" />
      <ellipse cx="126" cy="126" rx="4" ry="3" fill="white" opacity="0.55" />
      <ellipse cx="132" cy="129" rx="2" ry="1.5" fill="white" opacity="0.3" />
      <path
        d="M 116 138 Q 130 152 144 138"
        stroke="#C4845A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="112" cy="112" r="11" fill="#1E293B" />
      <circle cx="112" cy="112" r="8" fill="#2D4A3E" />
      <circle cx="114" cy="109" r="4" fill="white" opacity="0.9" />
      <circle cx="116" cy="110" r="2" fill="white" opacity="0.5" />
      <circle cx="148" cy="112" r="11" fill="#1E293B" />
      <circle cx="148" cy="112" r="8" fill="#2D4A3E" />
      <circle cx="150" cy="109" r="4" fill="white" opacity="0.9" />
      <circle cx="152" cy="110" r="2" fill="white" opacity="0.5" />
      <path
        d="M 104 101 Q 112 97 120 101"
        stroke="#B8744A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 140 101 Q 148 97 156 101"
        stroke="#B8744A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="98" cy="128" rx="10" ry="7" fill="#FF9999" opacity="0.28" />
      <ellipse cx="162" cy="128" rx="10" ry="7" fill="#FF9999" opacity="0.28" />
      <path
        d="M 72 110 Q 55 125 58 148"
        stroke="#334155"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="48" y="143" width="20" height="12" rx="6" fill="#1E293B" />
      <rect x="50" y="145" width="16" height="8" rx="4" fill="#00C49A" />
      <circle cx="58" cy="149" r="2.5" fill="white" opacity="0.7" />
      <ellipse cx="100" cy="224" rx="20" ry="14" fill="#E8B87A" />
      <ellipse cx="160" cy="224" rx="20" ry="14" fill="#E8B87A" />
      <circle cx="96" cy="220" r="4" fill="#D4956B" opacity="0.5" />
      <circle cx="104" cy="218" r="4" fill="#D4956B" opacity="0.5" />
      <circle cx="100" cy="228" r="4" fill="#D4956B" opacity="0.5" />
      <circle cx="156" cy="220" r="4" fill="#D4956B" opacity="0.5" />
      <circle cx="164" cy="218" r="4" fill="#D4956B" opacity="0.5" />
      <circle cx="160" cy="228" r="4" fill="#D4956B" opacity="0.5" />
      <path
        d="M 178 200 Q 210 170 202 148 Q 196 132 183 140"
        stroke="#E8B87A"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 178 200 Q 210 170 202 148 Q 196 132 183 140"
        stroke="#F5D5A8"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="130" cy="182" r="16" fill="#00C49A" filter="url(#glow)" />
      <circle cx="130" cy="182" r="13" fill="#00E5B0" />
      <text
        x="130"
        y="187"
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="#1E293B"
        fontFamily="sans-serif"
      >
        🐾
      </text>
    </svg>
  );
}

// ─── WELCOME MODAL ────────────────────────────────────────────────────────────
function WelcomeModal({ authUser, profile, onComplete }) {
  const isMobile = useIsMobile();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ripple, setRipple] = useState(false);

  const handleSubmit = async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 9) {
      setError("El número debe tener exactamente 9 dígitos.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await cloud.save(authUser.uid, "profile", {
        ...(profile || {}),
        phone: cleaned,
        welcomeCompleted: true,
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
    onComplete(cleaned);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        background: "rgba(10,30,26,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: isMobile ? "24px 24px 0 0" : 28,
          width: isMobile ? "100%" : "min(520px,94vw)",
          maxHeight: isMobile ? "92vh" : "94vh",
          overflowY: "auto",
          boxShadow:
            "0 32px 80px rgba(0,180,130,0.18),0 8px 32px rgba(0,0,0,0.14)",
          border: "1.5px solid #E0F7F2",
          animation: isMobile
            ? "slideUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both"
            : "fadeInScale 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}
      >
        <div
          style={{
            height: 6,
            background:
              "linear-gradient(90deg,#00D4A0,#00B386,#4DA6FF,#00D4A0)",
            backgroundSize: "200% auto",
            animation: "shimmer 3s linear infinite",
            borderRadius: isMobile ? "24px 24px 0 0" : "28px 28px 0 0",
          }}
        />
        {isMobile && (
          <div
            style={{
              width: 40,
              height: 4,
              background: C.border,
              borderRadius: 2,
              margin: "12px auto 0",
            }}
          />
        )}
        <div
          style={{ padding: isMobile ? "20px 24px 32px" : "32px 40px 36px" }}
        >
          <div
            className="float-dog"
            style={{
              marginBottom: 8,
              filter: "drop-shadow(0 8px 24px rgba(0,180,130,0.22))",
            }}
          >
            <PawiDogIllustration size={isMobile ? 140 : 200} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#00D4A015,#4DA6FF10)",
                border: "1.5px solid #00D4A040",
                borderRadius: 100,
                padding: "5px 16px",
                fontSize: 11,
                fontWeight: 800,
                color: "#00875A",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              🐾 Pawi · Plataforma Veterinaria
            </div>
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
              color: "#1E293B",
              textAlign: "center",
              marginBottom: 10,
              lineHeight: 1.25,
            }}
          >
            ¡Bienvenido a la comunidad Pawi!
            <span style={{ display: "block", fontSize: 22 }}>🐾</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              textAlign: "center",
              lineHeight: 1.65,
              marginBottom: 20,
            }}
          >
            Queremos que aproveches al máximo la plataforma.
            <br />
            <strong style={{ color: "#1E293B" }}>
              Déjanos tu número para:
            </strong>
          </p>
          <div
            style={{
              background: "linear-gradient(135deg,#F0FDF9,#EFF9FF)",
              border: "1.5px solid #D1FAF0",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {[
              ["📲", "Enviarte un tutorial rápido de bienvenida por WhatsApp."],
              ["🛠️", "Brindarte soporte directo ante cualquier duda técnica."],
              [
                "💬",
                "Escuchar tus comentarios y mejoras, ¡estamos en fase beta y tu experiencia es nuestra prioridad!",
              ],
            ].map(([icon, text], i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    flexShrink: 0,
                    background: "#00D4A018",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {icon}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.55,
                    margin: 0,
                    paddingTop: 6,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                pointerEvents: "none",
              }}
            >
              📞
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length > 0 && val[0] !== "9") {
                  setError("El número debe empezar con 9");
                  return;
                }
                if (val.length > 9) return;
                setPhone(val);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Número de celular"
              maxLength={9}
              style={{
                width: "100%",
                padding: "14px 18px 14px 50px",
                background: "#F8FAFC",
                border: `2px solid ${error ? C.danger : "#E2E8F0"}`,
                borderRadius: 14,
                color: "#1E293B",
                fontSize: 15,
                outline: "none",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
              }}
            />
          </div>
          {error && (
            <div
              style={{
                background: "#FF4D6D12",
                border: "1px solid #FF4D6D30",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                color: C.danger,
                marginBottom: 10,
              }}
            >
              ⚠️ {error}
            </div>
          )}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 14,
              marginTop: 6,
            }}
          >
            <button
              onClick={() => {
                setRipple(true);
                setTimeout(() => setRipple(false), 600);
                handleSubmit();
              }}
              disabled={saving}
              style={{
                width: "100%",
                padding: "15px",
                background: saving
                  ? "#94A3B8"
                  : "linear-gradient(135deg,#00D4A0,#00B386)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 16,
                cursor: saving ? "default" : "pointer",
                fontFamily: "inherit",
                boxShadow: saving ? "none" : "0 4px 20px rgba(0,180,130,0.35)",
                position: "relative",
                zIndex: 1,
              }}
            >
              {saving ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <span
                    className="spinner"
                    style={{
                      borderTopColor: "#fff",
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  />
                  Guardando...
                </span>
              ) : (
                "🚀 Comenzar"
              )}
            </button>
            {ripple && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.4)",
                  transform: "translate(-50%,-50%)",
                  animation: "ripple 0.6s ease-out forwards",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            )}
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#94A3B8",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            🔒 Tu número es confidencial. Solo lo usamos para soporte.
            <br />
            No compartimos tu información con terceros.
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("login");
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
        onAuth(cred.user, false);
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
        onAuth(cred.user, true);
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

  // ── MOBILE LAYOUT ──
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(160deg,#F0FDF4 0%,#E0F2FE 60%,#F0FDF4 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile Header */}
        <div style={{ padding: "32px 24px 24px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: C.accent + "20",
              border: `1px solid ${C.accent}40`,
              borderRadius: 100,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              color: "#0f766e",
              marginBottom: 16,
            }}
          >
            🐾 Pawi · VetCare Pro
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 28,
              lineHeight: 1.2,
              color: "#1E293B",
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            La plataforma
            <br />
            <span style={{ color: "#00b386" }}>veterinaria gratis</span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#475569",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Gestiona pacientes, citas e historial clínico desde tu celular o
            computadora.
          </p>
          {/* FREE Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg,#00D4A0,#00B386)",
              borderRadius: 100,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 4px 16px rgba(0,180,130,0.35)",
              marginBottom: 8,
            }}
          >
            🎉 ¡Completamente GRATIS!
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            {[
              "☁️ Datos en la nube",
              "📋 Historial clínico",
              "💉 Control de vacunas",
              "🔒 Recupera tu cuenta",
            ].map((f) => (
              <span
                key={f}
                style={{
                  background: "white",
                  border: `1px solid ${C.border}`,
                  borderRadius: 100,
                  padding: "4px 12px",
                  fontSize: 11,
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Mobile Form Card */}
        <div
          style={{
            flex: 1,
            background: C.surface,
            borderRadius: "24px 24px 0 0",
            padding: "28px 24px 40px",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* Tab switcher */}
          {mode !== "forgot" && (
            <div
              style={{
                display: "flex",
                background: C.bg,
                borderRadius: 12,
                padding: 4,
                gap: 4,
                marginBottom: 24,
              }}
            >
              {[
                ["login", "Iniciar sesión"],
                ["register", "Registrarse"],
              ].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    background: mode === m ? C.surface : "transparent",
                    color: mode === m ? C.text : C.textMuted,
                    boxShadow:
                      mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    transition: "all .15s",
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

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
                  marginBottom: 20,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Volver al inicio de sesión
              </button>
              {resetSent ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: 22,
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    ¡Correo enviado!
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    Revisa tu bandeja en <strong>{form.email}</strong>. Haz clic
                    en el enlace para restablecer tu contraseña.
                  </p>
                  <button
                    onClick={() => switchMode("login")}
                    style={{
                      width: "100%",
                      padding: 14,
                      background: C.accent,
                      color: "#1E293B",
                      border: "none",
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: 24,
                      fontWeight: 700,
                      marginBottom: 8,
                    }}
                  >
                    Recuperar contraseña
                  </div>
                  <p
                    style={{
                      color: C.textMuted,
                      fontSize: 13,
                      marginBottom: 24,
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
                        padding: 14,
                        background: C.accent,
                        color: "#1E293B",
                        border: "none",
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: "pointer",
                        opacity: loading ? 0.7 : 1,
                        fontFamily: "inherit",
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

          {mode !== "forgot" && (
            <>
              {error && (
                <div
                  style={{
                    background: "#FF4D6D15",
                    color: C.danger,
                    border: `1px solid ${C.danger}30`,
                    borderRadius: 10,
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
                    padding: 14,
                    background: C.accent,
                    color: "#1E293B",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    marginTop: 4,
                    opacity: loading ? 0.7 : 1,
                    fontFamily: "inherit",
                    boxShadow: "0 4px 16px rgba(0,180,130,0.3)",
                  }}
                >
                  {loading
                    ? "Cargando..."
                    : mode === "login"
                    ? "Entrar al panel"
                    : "Crear cuenta gratis"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT (original) ──
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* HERO */}
      <div
        style={{
          background: "linear-gradient(135deg,#F0FDF4,#E0F2FE)",
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
            marginBottom: 24,
            width: "fit-content",
          }}
        >
          🐾 Pawi · VetCare Pro
        </div>

        {/* FREE badge — prominente */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg,#00D4A0,#00B386)",
            borderRadius: 100,
            padding: "10px 22px",
            fontSize: 15,
            fontWeight: 800,
            color: "#fff",
            boxShadow: "0 6px 24px rgba(0,180,130,0.4)",
            marginBottom: 20,
            width: "fit-content",
          }}
        >
          🎉 ¡Completamente GRATIS para siempre!
        </div>

        <div
          style={{
            fontFamily: "'Playfair Display',serif",
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
          Gestiona pacientes, citas e historial clínico. Datos guardados en la
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
            ["📱", "Funciona en celular y computadora"],
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

      {/* FORM */}
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
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
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
                    Revisa tu bandeja en <strong>{form.email}</strong>.
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
                    💡 Si no lo ves, revisa tu carpeta de <strong>spam</strong>.
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
                      fontFamily: "inherit",
                    }}
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
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
                        fontFamily: "inherit",
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
          {mode !== "forgot" && (
            <>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 30,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {mode === "login"
                  ? "Bienvenido de vuelta"
                  : "Crear cuenta gratis"}
              </div>
              <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 28 }}>
                {mode === "login"
                  ? "Ingresa con tu correo para acceder a tus datos"
                  : "Regístrate gratis — tus datos quedan seguros"}
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
                    fontFamily: "inherit",
                  }}
                >
                  {loading
                    ? "Cargando..."
                    : mode === "login"
                    ? "Entrar al panel"
                    : "Crear cuenta gratis"}
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
  const isMobile = useIsMobile();
  const [authUser, setAuthUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedPet, setSelectedPet] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState([]);
  const [aptPrefill, setAptPrefill] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleAuth = useCallback((user, isNew = false) => {
    setAuthUser(user);
    if (isNew) setShowWelcomeModal(true);
  }, []);

  const handleWelcomeComplete = useCallback(
    async (phone) => {
      if (authUser) {
        // Volvemos a cargar todo ahora que los datos de prueba ya se terminaron de guardar
        const data = await cloud.loadAll(authUser.uid);
        if (data.profile) setProfile(data.profile);

        // ¡Agregamos estas líneas para que React actualice la vista con las mascotas y citas!
        setPets(data.pets);
        setVisits(data.visits);
        setVaccines(data.vaccines);
        setAppointments(data.appointments);
        setInventory(data.inventory);
      }
      setShowWelcomeModal(false);
    },
    [authUser]
  );

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
        <AuthScreen onAuth={handleAuth} />
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
    { label: "Citas hoy", value: todayAppointments, icon: "📅", color: C.info },
    {
      label: "Internados",
      value: internados.length,
      icon: "🏨",
      color: C.purple,
    },
  ];

  const navigateTo = (key) => {
    setPage(key);
    setSelectedPet(null);
    setSidebarOpen(false);
  };

  return (
    <>
      <style>{FONT}</style>

      {showWelcomeModal && (
        <WelcomeModal
          authUser={authUser}
          profile={profile}
          onComplete={handleWelcomeComplete}
        />
      )}

      {/* ── MODALS ── */}
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
        {/* ── DESKTOP SIDEBAR ── */}
        {!isMobile && (
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
                      fontFamily: "'Playfair Display',serif",
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
                  onClick={() => navigateTo(item.key)}
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
                    fontFamily: "inherit",
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
              style={{
                padding: "12px 16px",
                borderTop: `1px solid ${C.border}`,
              }}
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
                  fontFamily: "inherit",
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
                  fontFamily: "inherit",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* ── MOBILE TOP BAR ── */}
        {isMobile && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: C.surface,
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: C.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                🐾
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  VetCare
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: C.textMuted,
                    letterSpacing: ".5px",
                  }}
                >
                  PAWI MVP
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {saving && (
                <div
                  style={{ fontSize: 11, color: C.warning, fontWeight: 600 }}
                >
                  Guardando...
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ☰
              </button>
            </div>
          </div>
        )}

        {/* ── MOBILE SIDEBAR DRAWER ── */}
        {isMobile && sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 90,
                backdropFilter: "blur(2px)",
              }}
            />
            <div
              style={{
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                width: 260,
                background: C.surface,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                padding: "24px 0",
                boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
                animation: "fadeIn .25s ease",
              }}
            >
              <div
                style={{
                  padding: "0 20px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
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
                        fontFamily: "'Playfair Display',serif",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      VetCare
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>
                      MVP PLATFORM
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
              <nav style={{ flex: 1, padding: "16px 12px" }}>
                {MENU.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => navigateTo(item.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background:
                        page === item.key ? C.accentDim : "transparent",
                      color: page === item.key ? "#0f766e" : C.textMuted,
                      fontSize: 15,
                      fontWeight: page === item.key ? 700 : 500,
                      marginBottom: 4,
                      transition: "all .15s",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    {item.label}
                    {item.badge > 0 && (
                      <span
                        style={{
                          marginLeft: "auto",
                          background: C.danger,
                          color: "#fff",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
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
                style={{
                  padding: "12px 16px",
                  borderTop: `1px solid ${C.border}`,
                }}
              >
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
                    padding: "9px",
                    background: "#F1F5F9",
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 8,
                    fontFamily: "inherit",
                  }}
                >
                  ⬇ Exportar mis datos
                </button>
                <button
                  onClick={() => signOut(auth)}
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "transparent",
                    color: C.textMuted,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── MOBILE BOTTOM NAV ── */}
        {isMobile && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: C.surface,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
              paddingBottom: "env(safe-area-inset-bottom,0px)",
            }}
          >
            {MENU.map((item) => (
              <button
                key={item.key}
                onClick={() => navigateTo(item.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "10px 4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  position: "relative",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: page === item.key ? "#0f766e" : C.textDim,
                    letterSpacing: ".3px",
                  }}
                >
                  {item.label}
                </span>
                {page === item.key && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 24,
                      height: 3,
                      background: C.accent,
                      borderRadius: "0 0 3px 3px",
                    }}
                  />
                )}
                {item.badge > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: "calc(50% - 18px)",
                      background: C.danger,
                      color: "#fff",
                      borderRadius: "50%",
                      width: 14,
                      height: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <div
          style={{
            marginLeft: isMobile ? 0 : 220,
            flex: 1,
            padding: isMobile ? "72px 16px 80px" : 32,
            minHeight: "100vh",
          }}
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
  const isMobile = useIsMobile();
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 16 : 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: isMobile ? 22 : 28,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Panel Principal 👋
        </div>
        <div style={{ color: C.textMuted, fontSize: 13 }}>
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
          padding: isMobile ? "12px 14px" : "14px 20px",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          border: `1px solid ${C.border}`,
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 0,
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onNewPatient}
            style={{
              padding: "8px 14px",
              background: C.surface,
              color: "#1E293B",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            + Paciente
          </button>
          <button
            onClick={onNewAppointment}
            style={{
              padding: "8px 14px",
              background: C.accent,
              color: "#000",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            + Cita
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)",
          gap: isMobile ? 10 : 16,
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
              padding: isMobile ? "16px 14px" : 24,
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              gridColumn: isMobile && i === 2 ? "1 / -1" : "auto",
            }}
          >
            <div style={{ fontSize: isMobile ? 24 : 32, marginBottom: 8 }}>
              {s.icon}
            </div>
            <div
              style={{
                fontSize: isMobile ? 24 : 32,
                fontWeight: 700,
                color: s.color,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
          gap: isMobile ? 16 : 20,
        }}
      >
        <Card style={{ padding: isMobile ? 16 : 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16 }}>
              Próximas Citas
            </div>
            <button
              onClick={onNewAppointment}
              style={{
                background: C.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
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
                  gap: isMobile ? 10 : 14,
                  padding: "10px 0",
                  borderBottom: i < 4 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div style={{ fontSize: isMobile ? 20 : 24 }}>{a.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isMobile ? "nowrap" : "normal",
                    }}
                  >
                    {a.pet}{" "}
                    <span style={{ color: C.textMuted, fontWeight: 400 }}>
                      — {a.owner}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}
                  >
                    {a.type} · {a.date}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 13, color: "#0f766e" }}
                  >
                    {a.time}
                  </div>
                  {!isMobile && (
                    <div style={{ marginTop: 4 }}>
                      <Badge color={statusColor[a.status] || C.textMuted}>
                        {a.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          {appointments.length === 0 && (
            <div style={{ fontSize: 13, color: C.textMuted }}>
              No hay citas próximas.
            </div>
          )}
        </Card>

        <Card style={{ padding: isMobile ? 16 : 24 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: isMobile ? 14 : 16,
              marginBottom: 12,
              color: C.danger,
            }}
          >
            ⚠ Vacunas Vencidas
          </div>
          {expiredVaccines.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted }}>
              Sin alertas de vacunas. Todo al día. ✅
            </div>
          ) : (
            expiredVaccines.slice(0, isMobile ? 3 : 10).map((v, i) => {
              const pet = pets.find((p) => p.id === v.petId);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom:
                      i < expiredVaccines.length - 1
                        ? `1px solid ${C.border}`
                        : "none",
                  }}
                >
                  <div style={{ fontSize: 20 }}>💉</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {pet ? pet.name : "Desconocido"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.danger,
                      flexShrink: 0,
                    }}
                  >
                    {v.nextDue}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Internados */}
      <Card style={{ padding: isMobile ? 16 : 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16 }}>
              🏨 Pacientes Internados
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {internados.length} paciente{internados.length !== 1 ? "s" : ""}{" "}
              internado{internados.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onAdmitInternado}
            style={{
              background: C.purple,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: isMobile ? "7px 12px" : "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: isMobile ? 12 : 13,
              fontFamily: "inherit",
            }}
          >
            + Internar
          </button>
        </div>
        {internados.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: isMobile ? "20px 0" : "32px 0",
              color: C.textMuted,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>No hay
            pacientes internados.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill,minmax(280px,1fr))",
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
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: p.color + "20",
                      border: `2px solid ${p.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {p.breed}
                    </div>
                  </div>
                  <Badge color={C.purple}>Internado</Badge>
                </div>
                {p.admissionReason && (
                  <div
                    style={{
                      background: C.warning + "12",
                      border: `1px solid ${C.warning}30`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      marginBottom: 8,
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
                      fontFamily: "inherit",
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
                      fontFamily: "inherit",
                    }}
                  >
                    ✓ Alta
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
        placeholder="Ej: Post-operatorio, observación..."
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
          placeholder="Indicaciones, medicación..."
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
          }}
        >
          Internar
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── APPOINTMENTS PAGE ────────────────────────────────────────────────────────
function AppointmentsPage({ appointments, onAdd, onUpdate }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState(isMobile ? "Lista" : "Semana");
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

  const AptDetailPanel = ({ apt, onClose, onCycle }) => (
    <div
      className="fade-in"
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 80,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "flex-end",
            }
          : { width: 280, flexShrink: 0 }
      }
    >
      <div
        style={
          isMobile
            ? {
                width: "100%",
                background: C.surface,
                borderRadius: "20px 20px 0 0",
                padding: 24,
                maxHeight: "80vh",
                overflowY: "auto",
              }
            : {}
        }
      >
        <Card
          style={
            isMobile
              ? { padding: 0, border: "none", boxShadow: "none" }
              : { position: "sticky", top: 0, padding: 20 }
          }
        >
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
              <div style={{ fontSize: 13, color: C.textMuted }}>
                {apt.owner}
              </div>
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
                fontFamily: "inherit",
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
                  fontFamily: "inherit",
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
                fontFamily: "inherit",
              }}
            >
              🗑 Eliminar
            </button>
          </div>
        </Card>
      </div>
    </div>
  );

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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "inherit",
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
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isToday ? C.accent : C.border + "60",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 13,
                      color: isToday ? "#fff" : C.textMuted,
                    }}
                  >
                    {d.getDate()}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
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
                          gap: 10,
                          padding: isMobile ? "10px 14px" : "12px 20px",
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
                        <div style={{ fontSize: 20 }}>{a.avatar}</div>
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
                            {a.pet}{" "}
                            <span
                              style={{ color: C.textMuted, fontWeight: 400 }}
                            >
                              — {a.owner}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>
                            {a.type}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "#0f766e",
                            flexShrink: 0,
                          }}
                        >
                          {a.time}
                        </div>
                        <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                        {!isMobile &&
                          a.status !== "Cancelado" &&
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
                                fontFamily: "inherit",
                              }}
                            >
                              →
                            </button>
                          )}
                        {!isMobile && (
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
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "inherit",
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    ))}
                </Card>
              </div>
            );
          })
        )}
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

  const WeekView = () => {
    const baseMonday = new Date(today);
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    baseMonday.setDate(today.getDate() - dow + weekOffset * 7);
    const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      return d;
    });
    const weekStart = weekDays[0],
      weekEnd = weekDays[6];
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
                  fontFamily: "inherit",
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
                      fontFamily: "inherit",
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
                    fontFamily: "inherit",
                  }}
                >
                  ›
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 600 }}>
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
                          padding: "8px 4px",
                          textAlign: "center",
                          borderLeft: `1px solid ${C.border}`,
                          background: isToday ? C.accent + "10" : "transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
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
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: isToday ? C.accent : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "3px auto",
                            fontWeight: 800,
                            fontSize: 14,
                            color: isToday ? "#fff" : C.text,
                          }}
                        >
                          {d.getDate()}
                        </div>
                        {dayApts > 0 && (
                          <div
                            style={{
                              fontSize: 9,
                              background: isToday ? "#0f766e" : C.info,
                              color: "#fff",
                              borderRadius: 100,
                              padding: "1px 5px",
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
                <div style={{ overflowY: "auto", maxHeight: 440 }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "52px repeat(7,1fr)",
                        borderBottom: `1px solid ${C.border}`,
                        minHeight: 56,
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 4px 0 10px",
                          fontSize: 10,
                          color: C.textDim,
                          fontWeight: 600,
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
                              padding: "3px 4px",
                              background: isToday
                                ? C.accent + "04"
                                : "transparent",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                              cursor: "cell",
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
                                  borderRadius: "0 5px 5px 0",
                                  padding: "2px 5px",
                                  cursor: "pointer",
                                  fontSize: 10,
                                  lineHeight: 1.3,
                                }}
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
        {selectedApt && !isMobile && (
          <AptDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onCycle={cycleStatus}
          />
        )}
        {selectedApt && isMobile && (
          <AptDetailPanel
            apt={selectedApt}
            onClose={() => setSelectedApt(null)}
            onCycle={cycleStatus}
          />
        )}
      </div>
    );
  };

  const MonthView = () => {
    const refDate = new Date(
      today.getFullYear(),
      today.getMonth() + monthOffset,
      1
    );
    const year = refDate.getFullYear(),
      month = refDate.getMonth();
    const firstDay = new Date(year, month, 1),
      lastDay = new Date(year, month + 1, 0);
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
                  fontFamily: "inherit",
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
                      fontFamily: "inherit",
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
                  fontFamily: "inherit",
                }}
              >
                ›
              </button>
            </div>
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
                    padding: "8px 0",
                    textAlign: "center",
                    fontSize: 10,
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
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}
            >
              {cells.map((cell, i) => {
                if (!cell)
                  return (
                    <div
                      key={i}
                      style={{
                        minHeight: isMobile ? 60 : 90,
                        borderRight: `1px solid ${C.border}`,
                        borderBottom: `1px solid ${C.border}`,
                        background: "#FAFBFC",
                      }}
                    />
                  );
                const { dayNum, ds, isToday, isPast } = cell;
                const apts = getMonthApts(ds);
                const MAX_SHOW = isMobile ? 1 : 3;
                return (
                  <div
                    key={i}
                    onClick={() => onAdd({ date: ds })}
                    style={{
                      minHeight: isMobile ? 60 : 90,
                      borderRight: `1px solid ${C.border}`,
                      borderBottom: `1px solid ${C.border}`,
                      padding: isMobile ? "4px 3px" : "8px 6px",
                      background: isToday ? C.accent + "08" : "transparent",
                      cursor: "cell",
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? 22 : 26,
                        height: isMobile ? 22 : 26,
                        borderRadius: "50%",
                        background: isToday ? C.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: isToday ? 700 : 400,
                        fontSize: isMobile ? 11 : 13,
                        color: isToday ? "#fff" : isPast ? C.textDim : C.text,
                        marginBottom: 3,
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
                            borderRadius: "0 4px 4px 0",
                            padding: "1px 4px",
                            fontSize: 9,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                          }}
                        >
                          {a.time} {a.avatar} {a.pet}
                        </div>
                      ))}
                      {apts.length > MAX_SHOW && (
                        <div
                          style={{
                            fontSize: 9,
                            color: C.accent,
                            fontWeight: 700,
                            paddingLeft: 3,
                          }}
                        >
                          +{apts.length - MAX_SHOW}
                        </div>
                      )}
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

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
            }}
          >
            Gestión de Citas
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            {appointments.length} citas registradas
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* View tabs */}
          <div
            style={{
              display: "flex",
              background: C.bg,
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {(isMobile
              ? [
                  ["Lista", "☰"],
                  ["Mes", "🗓"],
                ]
              : [
                  ["Hoy", "📋"],
                  ["Semana", "📅"],
                  ["Mes", "🗓"],
                  ["Lista", "☰"],
                ]
            ).map(([v, icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: view === v ? C.surface : "transparent",
                  color: view === v ? C.text : C.textMuted,
                  fontFamily: "inherit",
                }}
              >
                {icon} {v}
              </button>
            ))}
          </div>
          <button
            onClick={onAdd}
            style={{
              background: C.accent,
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "9px 16px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            + Nueva Cita
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: isMobile ? 8 : 12,
        }}
      >
        {[
          { label: "Hoy", value: todayApts, icon: "☀️", color: C.accent },
          { label: "Semana", value: weekApts, icon: "📅", color: C.info },
          {
            label: "Pendientes",
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
              padding: isMobile ? "10px 12px" : "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 14,
            }}
          >
            <div style={{ fontSize: isMobile ? 20 : 28 }}>{s.icon}</div>
            <div>
              <div
                style={{
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 10 : 12,
                  color: C.textMuted,
                  fontWeight: 600,
                }}
              >
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {view === "Lista" && <ListView />}
      {view === "Semana" && <WeekView />}
      {view === "Mes" && <MonthView />}
      {view === "Hoy" && <ListView />}
    </div>
  );
}

// ─── PATIENTS PAGE ────────────────────────────────────────────────────────────
function PatientsPage({ pets, vaccines, visits, onSelect, onAdd }) {
  const isMobile = useIsMobile();
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}
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
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 26,
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
            padding: isMobile ? "8px 14px" : "10px 22px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: isMobile ? 13 : 14,
            fontFamily: "inherit",
          }}
        >
          + Nuevo
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 15,
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
            padding: "11px 14px 11px 40px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text,
            fontSize: 14,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
          gap: isMobile ? 10 : 16,
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
              padding: isMobile ? 14 : 20,
              cursor: "pointer",
              transition: "border-color .2s,transform .2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = p.color;
              if (!isMobile)
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
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: p.color + "15",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    border: `2px solid ${p.color}20`,
                  }}
                >
                  {p.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ color: C.textMuted, fontSize: 12 }}>
                    {p.breed} · {p.species}
                  </div>
                </div>
              </div>
              <Badge color={statusColor[p.status]}>{p.status}</Badge>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
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
                      fontSize: 9,
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
                      marginTop: 1,
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
  const isMobile = useIsMobile();
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

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}
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
          fontFamily: "inherit",
        }}
      >
        ← Volver
      </button>

      <Card
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 14 : 24,
          padding: isMobile ? 16 : 24,
        }}
      >
        <div
          style={{
            width: isMobile ? 60 : 80,
            height: isMobile ? 60 : 80,
            borderRadius: 16,
            background: pet.color + "15",
            border: `2px solid ${pet.color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: isMobile ? 32 : 44,
            flexShrink: 0,
          }}
        >
          {pet.avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 28,
              fontWeight: 700,
            }}
          >
            {pet.name}
          </div>
          <div style={{ color: C.textMuted, fontSize: 13 }}>
            {pet.breed} · {pet.species}
          </div>
          <div
            style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}
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
                  padding: "2px 10px",
                  fontSize: 11,
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
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
          overflowX: "auto",
        }}
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: isMobile ? "9px 12px" : "10px 18px",
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: "none",
              color: tab === key ? "#0f766e" : C.textMuted,
              borderBottom: `2px solid ${
                tab === key ? "#0f766e" : "transparent"
              }`,
              marginBottom: -1,
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 14 : 20,
          }}
        >
          <Card style={{ padding: isMobile ? 16 : 24 }}>
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
                    fontFamily: "inherit",
                  }}
                >
                  ✏️ Editar
                </button>
              )}
            </div>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Nombre", "name"],
                  ["Especie", "species"],
                  ["Raza", "breed"],
                  ["Color de pelaje", "coatColor"],
                  ["Edad", "age"],
                  ["Peso", "weight"],
                ].map(([label, field]) => (
                  <Input
                    key={field}
                    label={label}
                    value={editForm[field] || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, [field]: e.target.value })
                    }
                  />
                ))}
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
                    padding: "9px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.textMuted, fontSize: 13 }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                </div>
              ))
            )}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card style={{ padding: isMobile ? 16 : 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                Propietario
              </div>
              {isEditing ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Input
                    label="Nombre"
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
                      padding: "9px 0",
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
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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
                      fontFamily: "inherit",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onUpdatePet(editForm);
                      setIsEditing(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: C.accent,
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Guardar
                  </button>
                </div>
              )}
            </Card>
            <Card style={{ padding: isMobile ? 14 : 24 }}>
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
                    fontFamily: "inherit",
                  }}
                >
                  🗑 Eliminar paciente
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
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
                      fontFamily: "inherit",
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
                      fontFamily: "inherit",
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
              marginBottom: 14,
            }}
          >
            <button
              onClick={onAddVisit}
              style={{
                background: C.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              + Agregar consulta
            </button>
          </div>
          {visits.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: 40, color: C.textMuted }}
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
                      marginBottom: 16,
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
                    <Card style={{ padding: 14 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        {v.date}
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: v.diagnosis ? 6 : 0,
                        }}
                      >
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
              marginBottom: 14,
            }}
          >
            <button
              onClick={onAddVaccine}
              style={{
                background: C.info,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              + Agregar vacuna
            </button>
          </div>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vaccines.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: C.textMuted,
                  }}
                >
                  Sin vacunas registradas
                </div>
              ) : (
                vaccines.map((v, i) => (
                  <Card key={i} style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>💉 {v.name}</div>
                      <Badge
                        color={v.status === "vencida" ? C.danger : C.accent}
                      >
                        {v.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      Aplicada: <strong>{v.date}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      Próxima: <strong>{v.nextDue}</strong>
                    </div>
                    {v.lot && (
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        Lote: {v.lot}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          ) : (
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
          )}
        </div>
      )}

      {tab === "citas" && (
        <Card style={{ padding: isMobile ? 14 : 24 }}>
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
                  padding: "11px 0",
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

// ─── RECORDS PAGE ─────────────────────────────────────────────────────────────
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
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [addingVisit, setAddingVisit] = useState(false);
  const [addingVaccine, setAddingVaccine] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPatientList, setShowPatientList] = useState(true);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search) return pets;
    const q = search.toLowerCase();
    return pets.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.owner?.toLowerCase().includes(q) ||
        p.breed?.toLowerCase().includes(q)
    );
  }, [pets, search]);
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
  const handleSaveVisit = async (u) => {
    await onUpdateVisits(visits.map((v) => (v.id === u.id ? u : v)));
    setEditingVisit(null);
  };
  const handleSaveVaccine = async (u) => {
    await onUpdateVaccines(vaccines.map((v) => (v.id === u.id ? u : v)));
    setEditingVaccine(null);
  };
  const handleAddNewVisit = async (n) => {
    await onUpdateVisits([n, ...visits]);
    setAddingVisit(false);
  };
  const handleAddNewVaccine = async (n) => {
    await onUpdateVaccines([n, ...vaccines]);
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
    padding: isMobile ? 14 : 18,
    marginBottom: 14,
  });
  const ItemActions = ({ onEdit, id }) => (
    <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexShrink: 0 }}>
      <button
        onClick={onEdit}
        style={{
          background: C.info + "15",
          border: `1px solid ${C.info}30`,
          borderRadius: 7,
          padding: "3px 8px",
          cursor: "pointer",
          fontSize: 11,
          color: C.info,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        ✏️
      </button>
      <button
        onClick={() => setDeleteConfirm(id)}
        style={{
          background: C.danger + "10",
          border: `1px solid ${C.danger}25`,
          borderRadius: 7,
          padding: "3px 8px",
          cursor: "pointer",
          fontSize: 11,
          color: C.danger,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        🗑
      </button>
    </div>
  );

  // Mobile: show either list or detail, not both
  const handleSelectPet = (petId) => {
    setSelectedPetId(petId === selectedPetId ? null : petId);
    if (isMobile) setShowPatientList(false);
  };

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        gap: isMobile ? 0 : 24,
        height: isMobile ? "auto" : "calc(100vh - 64px)",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
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
            ¿Estás seguro de que deseas eliminar este registro?
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
              }}
            >
              Sí, eliminar
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Patient List Panel */}
      {(!isMobile || showPatientList) && (
        <div
          style={{
            width: isMobile ? "100%" : 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 20 : 22,
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
                fontSize: 13,
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
                padding: "9px 12px 9px 32px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
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
              overflowY: isMobile ? "visible" : "auto",
              flex: isMobile ? "none" : 1,
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
                <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>Sin
                pacientes aún.
              </div>
            )}
            {filtered.map((p) => {
              const vCount = visits.filter((v) => v.petId === p.id).length;
              const vacCount = vaccines.filter((v) => v.petId === p.id).length;
              const isSelected = selectedPetId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPet(p.id)}
                  style={{
                    background: isSelected ? p.color + "12" : C.surface,
                    border: `1.5px solid ${isSelected ? p.color : C.border}`,
                    borderRadius: 12,
                    padding: "11px 13px",
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: p.color + "20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      {p.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {p.owner}
                      </div>
                    </div>
                    {isMobile && (
                      <span style={{ fontSize: 14, color: C.textMuted }}>
                        ›
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                    <span
                      style={{
                        fontSize: 10,
                        background: C.info + "15",
                        color: C.info,
                        borderRadius: 6,
                        padding: "2px 7px",
                        fontWeight: 600,
                      }}
                    >
                      📋 {vCount}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: C.accent + "15",
                        color: "#0f766e",
                        borderRadius: 6,
                        padding: "2px 7px",
                        fontWeight: 600,
                      }}
                    >
                      💉 {vacCount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {(!isMobile || !showPatientList) && (
        <div style={{ flex: 1, overflowY: isMobile ? "visible" : "auto" }}>
          {isMobile && selectedPet && (
            <button
              onClick={() => setShowPatientList(true)}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textMuted,
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 14,
                fontFamily: "inherit",
              }}
            >
              ← Volver a la lista
            </button>
          )}
          {!selectedPet ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: isMobile ? "auto" : "100%",
                color: C.textMuted,
                padding: isMobile ? "40px 0" : 0,
              }}
            >
              <div style={{ fontSize: 56, marginBottom: 14 }}>🐾</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                Selecciona un paciente
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                para ver su ficha médica completa
              </div>
            </div>
          ) : (
            <div className="fade-in">
              <Card
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? 14 : 20,
                  padding: isMobile ? 14 : 24,
                }}
              >
                <div
                  style={{
                    width: isMobile ? 56 : 72,
                    height: isMobile ? 56 : 72,
                    borderRadius: 16,
                    background: selectedPet.color + "15",
                    border: `2px solid ${selectedPet.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMobile ? 28 : 38,
                    flexShrink: 0,
                  }}
                >
                  {selectedPet.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: isMobile ? 20 : 24,
                      fontWeight: 700,
                    }}
                  >
                    {selectedPet.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {selectedPet.breed} · {selectedPet.species} ·{" "}
                    {selectedPet.age}
                  </div>
                  <div
                    style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}
                  >
                    Dueño: <strong>{selectedPet.owner}</strong> · 📞{" "}
                    {selectedPet.phone || "—"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{ fontSize: 11, fontWeight: 700, color: C.info }}
                    >
                      📋 {petVisits.length} visitas
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#0f766e",
                      }}
                    >
                      💉 {petVaccines.length} vacunas
                    </span>
                    <span
                      style={{ fontSize: 11, fontWeight: 700, color: C.purple }}
                    >
                      📁 {petResults.length} docs
                    </span>
                  </div>
                </div>
              </Card>

              {/* Vacunación */}
              <div style={sectionStyle(C.accent)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>💉</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Vacunación
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {petVaccines.length} reg.
                  </span>
                  <button
                    onClick={() => setAddingVaccine(true)}
                    style={{
                      background: C.accent,
                      color: "#000",
                      border: "none",
                      borderRadius: 7,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {petVaccines.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      textAlign: "center",
                      padding: "10px 0",
                    }}
                  >
                    Sin vacunas. Haz clic en "+ Agregar".
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    {[...petVaccines]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((v, i) => (
                        <div
                          key={i}
                          style={{
                            background: C.surface,
                            borderRadius: 10,
                            padding: "10px 14px",
                            border: `1px solid ${C.border}`,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                marginBottom: 3,
                              }}
                            >
                              {v.name}
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>
                              Aplicada: <strong>{v.date}</strong> · Próxima:{" "}
                              <strong>{v.nextDue}</strong>
                              {v.lot ? ` · Lote: ${v.lot}` : ""}
                            </div>
                            {v.notes && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: C.textMuted,
                                  marginTop: 3,
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

              {/* Tratamientos */}
              <div style={sectionStyle(C.info)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>💊</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Tratamientos
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {treatments.length} reg.
                  </span>
                  <button
                    onClick={() => setAddingVisit(true)}
                    style={{
                      background: C.info,
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {treatments.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      textAlign: "center",
                      padding: "10px 0",
                    }}
                  >
                    Sin tratamientos registrados.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    {[...treatments]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((v, i) => (
                        <div
                          key={i}
                          style={{
                            background: C.surface,
                            borderRadius: 10,
                            padding: "12px 14px",
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <Badge color={C.info}>{v.type}</Badge>
                            <span
                              style={{
                                fontSize: 11,
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
                                fontSize: 12,
                                color: C.text,
                                lineHeight: 1.5,
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
                                padding: "7px 10px",
                                marginTop: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.info,
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                💊 Medicamentos
                              </div>
                              <div style={{ fontSize: 12 }}>
                                {v.medications}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Cirugías */}
              <div style={sectionStyle(C.danger)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🔬</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Cirugías</div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {surgeries.length} reg.
                  </span>
                  <button
                    onClick={() => setAddingVisit(true)}
                    style={{
                      background: C.danger,
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {surgeries.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      textAlign: "center",
                      padding: "10px 0",
                    }}
                  >
                    Sin cirugías registradas.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    {[...surgeries]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((v, i) => (
                        <div
                          key={i}
                          style={{
                            background: C.surface,
                            borderRadius: 10,
                            padding: "12px 14px",
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <Badge color={C.danger}>{v.type}</Badge>
                            <span
                              style={{
                                fontSize: 11,
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
                                fontSize: 12,
                                color: C.text,
                                lineHeight: 1.5,
                              }}
                            >
                              {v.diagnosis}
                            </div>
                          )}
                          {v.postopNotes && (
                            <div
                              style={{
                                background: C.accent + "08",
                                border: `1px solid ${C.accent}20`,
                                borderRadius: 8,
                                padding: "7px 10px",
                                marginTop: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#0f766e",
                                  textTransform: "uppercase",
                                  marginBottom: 2,
                                }}
                              >
                                ✅ Post-operatorio
                              </div>
                              <div style={{ fontSize: 12 }}>
                                {v.postopNotes}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Consultas generales */}
              <div style={sectionStyle(C.purple)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Consultas generales
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {consultations.length} reg.
                  </span>
                  <button
                    onClick={() => setAddingVisit(true)}
                    style={{
                      background: C.purple,
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    + Agregar
                  </button>
                </div>
                {consultations.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      textAlign: "center",
                      padding: "10px 0",
                    }}
                  >
                    Sin consultas generales.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    {[...consultations]
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                      )
                      .map((v, i) => (
                        <div
                          key={i}
                          style={{
                            background: C.surface,
                            borderRadius: 10,
                            padding: "12px 14px",
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              marginBottom: v.diagnosis ? 6 : 0,
                            }}
                          >
                            <Badge color={C.purple}>{v.type}</Badge>
                            <span
                              style={{
                                fontSize: 11,
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
                                fontSize: 12,
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

              {/* Documentos */}
              <div style={sectionStyle("#6B7280")}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 18 }}>📁</span>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    Documentos
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {petResults.length} docs
                  </span>
                  <label
                    style={{
                      background: "#1E293B",
                      color: "#fff",
                      border: "none",
                      borderRadius: 7,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-block",
                    }}
                  >
                    + Subir
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
                    border: "1px dashed #CBD5E1",
                    borderRadius: 10,
                    padding: "8px 12px",
                    marginBottom: 10,
                    fontSize: 11,
                    color: C.textMuted,
                  }}
                >
                  💡 PDF, JPG, PNG. Se guardan en la sesión activa.
                </div>
                {petResults.length === 0 ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      textAlign: "center",
                      padding: "14px 0",
                    }}
                  >
                    Sin documentos subidos.
                  </div>
                ) : (
                  petResults.map((r, i) => {
                    const isPdf = r.fileType === "application/pdf";
                    const isImage = r.fileType?.startsWith("image/");
                    return (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          borderRadius: 10,
                          padding: "10px 14px",
                          border: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 7,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: isPdf ? "#FF4D6D15" : "#4DA6FF15",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            flexShrink: 0,
                          }}
                        >
                          {isPdf ? "📄" : isImage ? "🖼️" : "📎"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.fileName}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: C.textMuted,
                              marginTop: 1,
                            }}
                          >
                            {r.uploadDate} · {r.fileSize}
                          </div>
                        </div>
                        {isImage && (
                          <img
                            src={r.fileData}
                            alt={r.fileName}
                            style={{
                              width: 38,
                              height: 38,
                              objectFit: "cover",
                              borderRadius: 6,
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
                            borderRadius: 7,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            textDecoration: "none",
                            flexShrink: 0,
                          }}
                        >
                          ⬇
                        </a>
                        <button
                          onClick={() => onDeleteResult(r.id)}
                          style={{
                            background: C.danger + "10",
                            border: `1px solid ${C.danger}25`,
                            borderRadius: 7,
                            padding: "4px 7px",
                            cursor: "pointer",
                            fontSize: 12,
                            color: C.danger,
                            flexShrink: 0,
                            fontFamily: "inherit",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EDIT MODALS ──────────────────────────────────────────────────────────────
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
    <ModalWrap title="✏️ Editar Registro" onClose={onClose}>
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
      <TextArea
        label="Diagnóstico / Notas"
        field="diagnosis"
        placeholder="Observaciones del veterinario..."
        rows={3}
      />
      {isTreatment && (
        <>
          <TextArea
            label="💊 Medicamentos"
            field="medications"
            placeholder="Ej: Amoxicilina 250mg c/8h x 7 días..."
          />
          <TextArea
            label="📌 Detalles importantes"
            field="details"
            placeholder="Indicaciones especiales..."
            rows={3}
          />
        </>
      )}
      {isSurgery && (
        <>
          <TextArea
            label="📋 Notas pre-operatorias"
            field="preopNotes"
            placeholder="Preparación, ayuno..."
          />
          <TextArea
            label="✅ Notas post-operatorias"
            field="postopNotes"
            placeholder="Recuperación, cuidados..."
          />
        </>
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
          }}
        >
          Guardar cambios
        </button>
      </div>
    </ModalWrap>
  );
}

function EditVaccineModal({ vaccine, onClose, onSave }) {
  const [form, setForm] = useState({ ...vaccine, notes: vaccine.notes || "" });
  return (
    <ModalWrap title="✏️ Editar Vacuna" onClose={onClose}>
      <Input
        label="Nombre de la vacuna *"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Ej: Triple Felina..."
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
          }}
        >
          Guardar cambios
        </button>
      </div>
    </ModalWrap>
  );
}

// ─── INVENTARIO ───────────────────────────────────────────────────────────────
function InventarioPage({ inventory, onUpdate }) {
  const isMobile = useIsMobile();
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
    if (editItem)
      await onUpdate(
        inventory.map((i) =>
          i.id === editItem.id ? { ...editItem, ...form } : i
        )
      );
    else await onUpdate([{ ...form, id: "inv_" + uid() }, ...inventory]);
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

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}
    >
      {showModal && (
        <ModalWrap
          title={editItem ? "✏️ Editar Producto" : "📦 Agregar Producto"}
          onClose={() => setShowModal(false)}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
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
              placeholder="unidades"
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
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <Input
              label="Fecha de vencimiento"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
            <Input
              label="Precio (S/)"
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
              }}
            >
              {editItem ? "Actualizar" : "Agregar"}
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
                fontFamily: "inherit",
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
                fontFamily: "inherit",
              }}
            >
              Eliminar
            </button>
          </div>
        </ModalWrap>
      )}

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
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
            }}
          >
            Inventario
          </div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>
            {inventory.length} productos · {lowStock.length} stock bajo ·{" "}
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
            padding: isMobile ? "8px 14px" : "10px 22px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: isMobile ? 13 : 14,
            fontFamily: "inherit",
          }}
        >
          + Agregar
        </button>
      </div>

      {(lowStock.length > 0 || expiredItems.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : lowStock.length > 0 && expiredItems.length > 0
              ? "1fr 1fr"
              : "1fr",
            gap: 10,
          }}
        >
          {lowStock.length > 0 && (
            <div
              style={{
                background: C.warning + "12",
                border: `1.5px solid ${C.warning}30`,
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.warning,
                  marginBottom: 7,
                  fontSize: 13,
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
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.name}: {item.quantity}
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
                padding: "12px 16px",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: C.danger,
                  marginBottom: 7,
                  fontSize: 13,
                }}
              >
                🚫 Vencidos ({expiredItems.length})
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {expiredItems.map((item) => (
                  <span
                    key={item.id}
                    style={{
                      background: C.danger + "15",
                      color: C.danger,
                      borderRadius: 8,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 13,
            }}
          >
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Todos", ...CATEGORIES].map((f) => (
            <button
              key={f}
              onClick={() => setCatFilter(f)}
              style={{
                background: catFilter === f ? "#1E293B" : C.surface,
                color: catFilter === f ? "#fff" : C.textMuted,
                border: `1px solid ${catFilter === f ? "#1E293B" : C.border}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {f === "Todos" ? "🗂 Todos" : `${CAT_ICON[f]} ${f}`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "50px 0", color: C.textMuted }}
        >
          <div style={{ fontSize: 44, marginBottom: 10 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            Inventario vacío
          </div>
          <div style={{ fontSize: 13 }}>
            {inventory.length === 0
              ? "Agrega tu primer producto."
              : "No hay productos que coincidan."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill,minmax(300px,1fr))",
            gap: isMobile ? 10 : 16,
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
                  padding: isMobile ? 14 : 18,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: color + "18",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {CAT_ICON[item.category] || "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <Badge color={color}>{item.category}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(item)}
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 7,
                        padding: "3px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.textMuted,
                        fontFamily: "inherit",
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
                        padding: "3px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.danger,
                        fontFamily: "inherit",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
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
                        fontSize: 11,
                        color: C.textMuted,
                        fontWeight: 600,
                      }}
                    >
                      Stock actual
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                      <button
                        onClick={() => adjustQty(item, -1)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.danger,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "inherit",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                          color: isLow ? C.warning : color,
                          minWidth: 32,
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => adjustQty(item, 1)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          border: `1px solid ${C.border}`,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "inherit",
                        }}
                      >
                        +
                      </button>
                      <span style={{ fontSize: 11, color: C.textMuted }}>
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
                </div>
                {(item.expiryDate || item.price) && (
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
                            fontSize: 9,
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
                            fontSize: 9,
                            color: C.textDim,
                            fontWeight: 600,
                          }}
                        >
                          💰 Precio
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
                )}
                {(isLow || isExpired) && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {isLow && (
                      <span
                        style={{
                          background: C.warning + "18",
                          color: "#92400e",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 10,
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
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        🚫 Vencido
                      </span>
                    )}
                  </div>
                )}
                {item.notes && (
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textMuted,
                      fontStyle: "italic",
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: 8,
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
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,43,0.4)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: isMobile ? "20px 20px 0 0" : 20,
          padding: isMobile ? "24px 20px 32px" : 32,
          width: isMobile ? "100%" : 500,
          maxHeight: isMobile ? "92vh" : "90vh",
          overflowY: "auto",
          animation: isMobile ? "slideUp .35s ease" : "fadeIn .3s ease",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        {isMobile && (
          <div
            style={{
              width: 36,
              height: 4,
              background: C.border,
              borderRadius: 2,
              margin: "0 auto 16px",
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: isMobile ? 18 : 22,
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
              fontFamily: "inherit",
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
          placeholder="Escribe el nombre..."
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
          placeholder="Especifique..."
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
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
  const isMobile = useIsMobile();
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
        }}
      >
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
          paddingTop: 14,
          marginTop: 4,
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
            placeholder="987654321"
          />
          <Input
            label="Correo (Opcional)"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="mail@ejemplo.com"
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
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
        placeholder="Ej: Control, Urgencia, Tratamiento..."
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
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
            fontFamily: "inherit",
          }}
        >
          Guardar Vacuna
        </button>
      </div>
    </ModalWrap>
  );
}
