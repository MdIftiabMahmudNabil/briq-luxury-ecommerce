import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode, CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { ShoppingCart, Star, Trophy, RotateCcw, Play, ChevronDown, X, Check, Zap, Bomb, Swords, Sparkles, Crown, Skull, Plus, Minus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

// ── Brand + product imagery (user-provided assets) ─────────────────
import logoBriq from "../imports/Logo_Of_BRIQ__1_.png";
import heroImage from "../imports/card_image_1.png";
import brick1 from "../imports/Brick_type_1.png";
import brick1Slide from "../imports/Brick_type_1_sliding_image.png";
import brick2 from "../imports/Brick_type_2.png";
import brick2Slide from "../imports/Brick_type_2_sliding_image.png";
import brick3 from "../imports/brick_type_3.png";
import brick3Slide from "../imports/brick_type_3_sliding_image.png";
import brick4 from "../imports/brick_type_4.png";
import brick4Slide from "../imports/brick_type_4_sliding_image.png";
import brick5 from "../imports/brick_type_5.png";
import brick5Slide from "../imports/brick_type_5_sliding_image.png";
import brick6 from "../imports/brick_type_6.png";
import brick6Slide from "../imports/brick_type_6_sliding_image.png";
import brick7 from "../imports/brick_type_7.png";
import brick7Slide from "../imports/brick_type_7_sliding_image.png";
import brick8 from "../imports/brick_type_8.png";
import brick8Slide from "../imports/brick_type_8_sliding_image.png";
import brick9 from "../imports/brick_type_9.png";
import brick9Slide from "../imports/brick_type_9_sliding_image.png";
import heroBanner from "../imports/Hero_image_of_page.png";
import editorialMercedes from "../imports/card_image_2.png";
import editorialExchange from "../imports/card_image_3.png";
import dropFlatlay from "../imports/briiq.png";

// ── Reusable mono label (auction-house technical type) ─────────────
function Mono({
  children,
  className = "",
  style = {},
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={className}
      style={{ fontFamily: "'Space Mono', monospace", ...style }}
    >
      {children}
    </span>
  );
}

// ── Film-grain + vignette overlay (tactile luxury texture) ─────────
function GrainOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden>
      {/* SVG fractal-noise grain */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.05 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 76%, rgba(8,6,4,0.1) 100%)" }}
      />
    </div>
  );
}

// ── Custom gold cursor (ring + dot follower) ───────────────────────
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const hovering = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const el = e.target as HTMLElement;
      hovering.current = !!el.closest("a, button, canvas, [data-cursor]");
    };
    window.addEventListener("mousemove", move);

    const loop = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.18;
      ring.current.y += (pos.current.y - ring.current.y) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      }
      if (ringRef.current) {
        const s = hovering.current ? 2.1 : 1;
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) scale(${s})`;
        ringRef.current.style.opacity = hovering.current ? "1" : "0.5";
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] hidden md:block" aria-hidden>
      <div
        ref={ringRef}
        className="absolute -left-4 -top-4 w-8 h-8 rounded-full"
        style={{ border: "1px solid #c9a84c", transition: "opacity 200ms ease" }}
      />
      <div
        ref={dotRef}
        className="absolute -left-[2px] -top-[2px] w-1 h-1 rounded-full"
        style={{ background: "#c9a84c" }}
      />
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────
interface PlacedBrick {
  x: number;
  y: number;
  w: number;
  color: string;
}

type Level = "easy" | "medium" | "hard";

interface Bomb {
  x: number;
  y: number;
  vy: number;
}

interface GameState {
  stack: PlacedBrick[];
  cur: { x: number; w: number; dir: 1 | -1 };
  score: number;
  status: "idle" | "playing" | "won" | "over";
  level: Level;
  bossMaxHP: number;
  bossHP: number;
  blocked: boolean;
  blockTimer: number;
  bombs: Bomb[];
  bombTimer: number;
  shake: number;
}

// ── Constants ──────────────────────────────────────────────────────
const CANVAS_W = 340;
const CANVAS_H = 480;
const BRICK_H = 24;

const BRICK_PALETTE = [
  "#7a2020", "#8b2e18", "#7b3416", "#6b2a1a",
  "#8b3a22", "#5a2510", "#9b3f20", "#6e2a18",
];

// ── Level configuration ────────────────────────────────────────────
interface LevelConfig {
  label: string;
  boss: string | null;
  bossHP: number;
  target: number;      // win condition for no-boss levels (stack count)
  baseSpeed: number;
  speedRamp: number;
  blockEvery: number;  // frames between block phases (0 = never)
  blockDur: number;    // frames a block phase lasts
  bombEvery: number;   // frames between bombs (0 = never)
  blurb: string;
}

const LEVELS: Record<Level, LevelConfig> = {
  easy: {
    label: "Easy",
    boss: null,
    bossHP: 0,
    target: 8,
    baseSpeed: 2.0,
    speedRamp: 0.08,
    blockEvery: 0,
    blockDur: 0,
    bombEvery: 0,
    blurb: "A calm climb. No boss, no bombs — just you and gravity. Stack 8 to clear.",
  },
  medium: {
    label: "Medium",
    boss: "The Foreman",
    bossHP: 8,
    target: 0,
    baseSpeed: 2.6,
    speedRamp: 0.11,
    blockEvery: 300,
    blockDur: 48,
    bombEvery: 0,
    blurb: "The Foreman watches. He jams your hands now and then. Land 8 bricks to break him.",
  },
  hard: {
    label: "Hard",
    boss: "The Architect",
    bossHP: 12,
    target: 0,
    baseSpeed: 3.0,
    speedRamp: 0.13,
    blockEvery: 200,
    blockDur: 72,
    bombEvery: 150,
    blurb: "The Architect blocks your hands AND drops bombs — each placement defuses one. Survive and win 50% off.",
  },
};

// ── Motivational quotes shown on a loss ────────────────────────────
const LOSS_QUOTES: { q: string; a: string }[] = [
  { q: "A brick is the perfect form. The trick is only in the laying.", a: "The Foreman" },
  { q: "Every cathedral began with one crooked course, torn down and laid again.", a: "BRIQ Atelier" },
  { q: "Fall down seven bricks, stack eight.", a: "Proverb, adapted" },
  { q: "Precision is patience made visible. Begin again.", a: "The Architect" },
  { q: "The tower remembers every hand that failed it — and welcomes them back.", a: "BRIQ" },
];

const HARD_DISCOUNT_CODE = "BRIQHERO50";

// ── Quotes shown after a successful checkout ───────────────────────
const CHECKOUT_QUOTES: string[] = [
  "Possession is nine-tenths of taste. The other tenth is coming back for more.",
  "You own a piece of permanence. Most people only rent their dreams.",
  "A single brick is a beginning. A collection is a legacy.",
  "Great walls are built one acquisition at a time. Keep stacking.",
  "The kiln is already firing your next favourite. We'll be here.",
  "Few understand. You are now one of the few. Return often.",
];

const makeInitialState = (level: Level = "easy"): GameState => {
  const cfg = LEVELS[level];
  return {
    stack: [{ x: 0, y: CANVAS_H - BRICK_H, w: CANVAS_W, color: "#4a2010" }],
    cur: { x: 0, w: Math.floor(CANVAS_W * 0.72), dir: 1 },
    score: 0,
    status: "idle",
    level,
    bossMaxHP: cfg.bossHP,
    bossHP: cfg.bossHP,
    blocked: false,
    blockTimer: cfg.blockEvery,
    bombs: [],
    bombTimer: cfg.bombEvery,
    shake: 0,
  };
};

// ── Data ───────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: 1,
    lot: "001",
    name: "The Crimson Classic",
    edition: "Brick Type 01",
    origin: "Staffordshire, UK",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.7 kg",
    price: 299,
    rating: 4.9,
    reviews: 1847,
    desc: "Hand-fired in artisanal kilns at 1,200°C. A foundational piece for the discerning collector — worn here on the crown, as intended.",
    tag: "BESTSELLER",
    img: brick1,
    slideImg: brick1Slide,
  },
  {
    id: 2,
    lot: "002",
    name: "The Obsidian Reserve",
    edition: "Brick Type 02",
    origin: "Reykjavík, IS",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.9 kg",
    price: 499,
    rating: 5.0,
    reviews: 312,
    desc: "Carbon-washed perforated face with a sophisticated matte finish. Limited to 500 units worldwide.",
    tag: "LIMITED",
    img: brick2,
    slideImg: brick2Slide,
  },
  {
    id: 3,
    lot: "003",
    name: "The Noir Editrice",
    edition: "Brick Type 03",
    origin: "Carrara, IT",
    dims: "215 × 102.5 × 70 mm",
    mass: "3.1 kg",
    price: 399,
    rating: 4.8,
    reviews: 623,
    desc: "Ink-black composite with a velvet-soft surface. Pairs effortlessly with minimalist interiors and maximalist souls.",
    tag: null,
    img: brick3,
    slideImg: brick3Slide,
  },
  {
    id: 4,
    lot: "004",
    name: "The Graphite Meridian",
    edition: "Brick Type 04",
    origin: "Snowdonia, UK",
    dims: "220 × 105 × 68 mm",
    mass: "3.4 kg",
    price: 549,
    rating: 5.0,
    reviews: 187,
    desc: "Charcoal slate aggregate fused with recycled steel filaments. Structural art that doubles as a conversation.",
    tag: "RARE",
    img: brick4,
    slideImg: brick4Slide,
  },
  {
    id: 5,
    lot: "005",
    name: "The Ochre Archive",
    edition: "Brick Type 05",
    origin: "Siena, IT",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.6 kg",
    price: 349,
    rating: 4.9,
    reviews: 891,
    desc: "Sun-cured Tuscan clay. Each piece bears a unique mineral signature that cannot be replicated.",
    tag: "NEW",
    img: brick5,
    slideImg: brick5Slide,
  },
  {
    id: 6,
    lot: "006",
    name: "The Rouge Monolith",
    edition: "Brick Type 06",
    origin: "Jaipur, IN",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.8 kg",
    price: 449,
    rating: 4.7,
    reviews: 445,
    desc: "Deep terracotta with micro-flake quartz inclusions. A collector's statement, presented as a seated still life.",
    tag: null,
    img: brick6,
    slideImg: brick6Slide,
  },
  {
    id: 7,
    lot: "007",
    name: "The Sahara Edition",
    edition: "Brick Type 07",
    origin: "Marrakech, MA",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.5 kg",
    price: 629,
    rating: 5.0,
    reviews: 96,
    desc: "Desert-cured under open sky. A burnt-sienna monolith made to be carried, not laid. Photographed at golden hour.",
    tag: "EDITORIAL",
    img: brick8,
    slideImg: brick8Slide,
  },
  {
    id: 8,
    lot: "008",
    name: "The Continental",
    edition: "Brick Type 08",
    origin: "Stuttgart, DE",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.6 kg",
    price: 749,
    rating: 5.0,
    reviews: 64,
    desc: "Buff-fired touring clay, finished for the discerning motorist. Travels first class — preferably in the frunk.",
    tag: "GRAND TOUR",
    img: brick7,
    slideImg: brick7Slide,
  },
  {
    id: 9,
    lot: "009",
    name: "The Aegean Keepsake",
    edition: "Brick Type 09",
    origin: "Cyclades, GR",
    dims: "215 × 102.5 × 65 mm",
    mass: "2.4 kg",
    price: 829,
    rating: 5.0,
    reviews: 42,
    desc: "Chalk-white coastal clay, photographed at the waterline. A quiet object for sunlit rooms and permanent summer houses.",
    tag: "NEW ARRIVAL",
    img: brick9,
    slideImg: brick9Slide,
  },
];

const TESTIMONIALS = [
  {
    quote: "I placed the Crimson Classic on my mantle. My guests assume it's a Basquiat. I correct them. Then they ask where to buy one.",
    author: "Maximilian V.",
    title: "Art Collector, Geneva",
    rating: 5,
  },
  {
    quote: "The Obsidian Reserve arrived in a hand-sewn linen pouch with a certificate of singularity. I wept. My architect wept. The brick did not.",
    author: "Claudette R.",
    title: "Interior Architect, Paris",
    rating: 5,
  },
  {
    quote: "I gifted the Graphite Meridian to my father. He called it the most meaningful thing I have ever given him. I agree.",
    author: "James T.",
    title: "Entrepreneur, New York",
    rating: 5,
  },
];

const MARQUEE_ITEMS = [
  "THE FINEST BRICK IN THE WORLD",
  "FREE WHITE GLOVE DELIVERY",
  "CERTIFICATE OF SINGULARITY INCLUDED",
  "HANDCRAFTED IN ARTISANAL KILNS",
  "4.9★ AVERAGE COLLECTOR RATING",
  "SHIPS WITHIN 3 BUSINESS DAYS",
];

// ── BrickGame Component ────────────────────────────────────────────
function BrickGame({
  onClose,
  onGameOver,
}: {
  onClose: () => void;
  onGameOver: (score: number, name: string, won: boolean, level: Level) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const [uiScore, setUiScore] = useState(0);
  const [phase, setPhase] = useState<"select" | "playing" | "won" | "over">("select");
  const [end, setEnd] = useState<{ score: number; won: boolean; level: Level } | null>(null);
  const [quote, setQuote] = useState(LOSS_QUOTES[0]);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const endGame = useCallback((won: boolean) => {
    const s = stateRef.current;
    s.status = won ? "won" : "over";
    cancelAnimationFrame(rafRef.current);
    const finalScore = s.score;
    setUiScore(finalScore);
    setEnd({ score: finalScore, won, level: s.level });
    setSubmitted(false);
    if (!won) setQuote(LOSS_QUOTES[Math.floor(Math.random() * LOSS_QUOTES.length)]);
    setPhase(won ? "won" : "over");
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const cfg = LEVELS[s.level];

    const shakeX = s.shake > 0 ? (Math.random() - 0.5) * 7 : 0;
    ctx.save();
    ctx.translate(shakeX, 0);

    // Background
    ctx.clearRect(-10, 0, CANVAS_W + 20, CANVAS_H);
    ctx.fillStyle = "#06040299";
    ctx.fillRect(-10, 0, CANVAS_W + 20, CANVAS_H);

    // Subtle grid
    ctx.strokeStyle = "rgba(201,168,76,0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }

    // Boss band + HP
    if (cfg.boss) {
      const isHard = s.level === "hard";
      ctx.fillStyle = isHard ? "rgba(139,32,32,0.30)" : "rgba(201,168,76,0.12)";
      ctx.fillRect(0, 0, CANVAS_W, 30);
      ctx.fillStyle = isHard ? "#e07a5f" : "#c9a84c";
      ctx.font = "bold 11px 'Outfit', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(cfg.boss.toUpperCase(), 10, 14);
      const barX = 10, barY = 20, barW = CANVAS_W - 20, barH = 6;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(barX, barY, barW, barH);
      const hpFrac = s.bossMaxHP > 0 ? Math.max(0, s.bossHP) / s.bossMaxHP : 0;
      ctx.fillStyle = isHard ? "#e07a5f" : "#c9a84c";
      ctx.fillRect(barX, barY, barW * hpFrac, barH);
      ctx.strokeStyle = "rgba(201,168,76,0.3)";
      ctx.strokeRect(barX, barY, barW, barH);
    }

    // Placed bricks
    for (const b of s.stack) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, BRICK_H - 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 4);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(b.x + 1, b.y + BRICK_H - 4, b.w - 2, 3);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(b.x, b.y, b.w, 1);
    }

    // Bombs
    for (const bomb of s.bombs) {
      ctx.beginPath();
      ctx.fillStyle = "#15110c";
      ctx.arc(bomb.x, bomb.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e07a5f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f0a020";
      ctx.fillRect(bomb.x - 1, bomb.y - 13, 2, 5);
    }

    if (s.status === "playing") {
      const curY = CANVAS_H - BRICK_H * (s.stack.length + 1);
      const speed = cfg.baseSpeed + s.score * cfg.speedRamp;
      const colorIdx = s.score % BRICK_PALETTE.length;

      // Current (moving) brick — red when hands are blocked
      ctx.fillStyle = s.blocked ? "rgba(139,32,32,0.85)" : BRICK_PALETTE[colorIdx];
      ctx.fillRect(s.cur.x + 1, curY + 1, s.cur.w - 2, BRICK_H - 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(s.cur.x + 1, curY + 1, s.cur.w - 2, 4);
      ctx.strokeStyle = s.blocked ? "#e07a5f" : "#c9a84c";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(s.cur.x + 0.75, curY + 0.75, s.cur.w - 1.5, BRICK_H - 1.5);

      // Advance
      s.cur.x += s.cur.dir * speed;
      if (s.cur.x + s.cur.w > CANVAS_W) { s.cur.x = CANVAS_W - s.cur.w; s.cur.dir = -1; }
      if (s.cur.x < 0) { s.cur.x = 0; s.cur.dir = 1; }

      // Block phase toggling
      if (cfg.blockEvery > 0) {
        s.blockTimer -= 1;
        if (s.blockTimer <= 0) {
          s.blocked = !s.blocked;
          s.blockTimer = s.blocked ? cfg.blockDur : cfg.blockEvery;
        }
      }

      // Bombs spawn + fall
      if (cfg.bombEvery > 0) {
        s.bombTimer -= 1;
        if (s.bombTimer <= 0) {
          s.bombTimer = cfg.bombEvery;
          s.bombs.push({ x: 24 + Math.random() * (CANVAS_W - 48), y: 36, vy: 1.5 + s.score * 0.03 });
        }
        for (const bomb of s.bombs) bomb.y += bomb.vy;
        if (s.bombs.some((b) => b.y >= CANVAS_H - 6)) {
          endGame(false);
          ctx.restore();
          return;
        }
      }

      if (s.shake > 0) s.shake -= 1;
    }

    // Blocked banner
    if (s.status === "playing" && s.blocked) {
      ctx.fillStyle = "rgba(224,122,95,0.95)";
      ctx.font = "bold 11px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HANDS BLOCKED", CANVAS_W / 2, CANVAS_H - 14);
    }

    // Score / target HUD
    ctx.fillStyle = "rgba(201,168,76,0.9)";
    ctx.font = "bold 12px 'Outfit', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(cfg.boss ? `STACK ${s.score}` : `STACK ${s.score}/${cfg.target}`, CANVAS_W - 10, cfg.boss ? 46 : 18);

    ctx.restore();

    if (s.status === "playing") rafRef.current = requestAnimationFrame(draw);
  }, [endGame]);

  const drop = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== "playing") return;
    const cfg = LEVELS[s.level];

    // Boss is jamming your hands
    if (s.blocked) {
      s.shake = 10;
      return;
    }

    const top = s.stack[s.stack.length - 1];
    const overlapLeft = Math.max(s.cur.x, top.x);
    const overlapRight = Math.min(s.cur.x + s.cur.w, top.x + top.w);
    const overlapW = Math.round(overlapRight - overlapLeft);

    if (overlapW <= 4) {
      endGame(false);
      draw();
      return;
    }

    const colorIdx = s.score % BRICK_PALETTE.length;
    s.stack.push({ x: overlapLeft, y: top.y - BRICK_H, w: overlapW, color: BRICK_PALETTE[colorIdx] });
    s.score += 1;
    s.cur = {
      x: s.cur.dir === 1 ? CANVAS_W : -overlapW,
      w: overlapW,
      dir: s.cur.dir === 1 ? -1 : 1,
    };
    setUiScore(s.score);

    // A clean placement defuses the lowest bomb
    if (s.bombs.length) {
      let idx = 0;
      for (let i = 1; i < s.bombs.length; i++) if (s.bombs[i].y > s.bombs[idx].y) idx = i;
      s.bombs.splice(idx, 1);
    }

    // Damage boss / check win
    if (cfg.boss) {
      s.bossHP -= 1;
      if (s.bossHP <= 0) { endGame(true); draw(); return; }
    } else if (s.score >= cfg.target) {
      endGame(true);
      draw();
      return;
    }
  }, [draw, endGame]);

  const startGame = useCallback((level: Level) => {
    cancelAnimationFrame(rafRef.current);
    stateRef.current = makeInitialState(level);
    stateRef.current.status = "playing";
    setUiScore(0);
    setEnd(null);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Escape") { onClose(); return; }
      if ((e.code === "Space" || e.code === "Enter") && stateRef.current.status === "playing") {
        e.preventDefault();
        drop();
      }
    },
    [drop, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const submitScore = () => {
    if (!end || submitted) return;
    onGameOver(end.score, name.trim() || "Anonymous", end.won, end.level);
    setSubmitted(true);
  };

  const levelMeta: Record<Level, { icon: ReactNode; tag: string }> = {
    easy: { icon: <Sparkles size={13} />, tag: "No boss" },
    medium: { icon: <Swords size={13} />, tag: "Boss: The Foreman" },
    hard: { icon: <Bomb size={13} />, tag: "Boss: The Architect + Bombs" },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8,6,4,0.96)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Header */}
        <div className="flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-[#c9a84c]" />
            <span
              className="text-[#c9a84c] text-[12px] tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              The Stack
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#b7a98a] hover:text-[#c9a84c] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas */}
        <div className="relative border border-[rgba(201,168,76,0.2)]" style={{ width: CANVAS_W, height: CANVAS_H }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={drop}
            className="block cursor-pointer"
          />

          {/* ── Difficulty select ── */}
          {phase === "select" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
              style={{ background: "rgba(8,6,4,0.9)" }}
            >
              <Trophy className="text-[#c9a84c] mb-3" size={38} />
              <h4 className="text-white text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                Brick Stack
              </h4>
              <p
                className="text-[#b7a98a] text-[11px] mb-6 text-center leading-relaxed"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Choose your difficulty.
              </p>
              <div className="flex flex-col gap-2.5 w-full">
                {(["easy", "medium", "hard"] as Level[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => startGame(lv)}
                    className="text-left p-3 transition-all duration-200 hover:scale-[1.02]"
                    style={{ border: "1px solid rgba(201,168,76,0.25)", background: "rgba(17,14,9,0.7)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-[12px]" style={{ color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}>
                        <span style={{ color: lv === "hard" ? "#e07a5f" : "#c9a84c" }}>{levelMeta[lv].icon}</span>
                        {LEVELS[lv].label}
                      </span>
                      <Mono className="text-[11px] tracking-wider uppercase" style={{ color: lv === "hard" ? "#e07a5f" : "#b7a98a" }}>
                        {levelMeta[lv].tag}
                      </Mono>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                      {LEVELS[lv].blurb}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── End panel (won / over) ── */}
          {(phase === "won" || phase === "over") && end && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto px-6 py-7"
              style={{ background: "rgba(8,6,4,0.93)" }}
            >
              {end.won ? (
                <Crown className="text-[#c9a84c] mb-2" size={36} />
              ) : (
                <Skull className="text-[#e07a5f] mb-2" size={34} />
              )}
              <p
                className="text-[11px] tracking-[0.3em] uppercase mb-1"
                style={{ color: end.won ? "#c9a84c" : "#e07a5f", fontFamily: "'Outfit', sans-serif" }}
              >
                {end.won ? `${LEVELS[end.level].label} Cleared` : "Tower Collapsed"}
              </p>
              <p
                className="text-[#c9a84c] text-6xl font-bold mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {end.score}
              </p>

              {/* Hard win → discount */}
              {end.won && end.level === "hard" && (
                <div
                  className="w-full text-center p-3 my-3"
                  style={{ border: "1px solid #c9a84c", background: "rgba(201,168,76,0.1)" }}
                >
                  <Mono className="block text-[11px] tracking-[0.25em] uppercase mb-1.5" style={{ color: "#c9a84c" }}>
                    Your Reward · 50% Off
                  </Mono>
                  <p className="text-2xl mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8", letterSpacing: "0.1em" }}>
                    {HARD_DISCOUNT_CODE}
                  </p>
                  <p className="text-[11px]" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                    You defeated The Architect. Apply at checkout.
                  </p>
                </div>
              )}

              {/* Lesser win note */}
              {end.won && end.level !== "hard" && (
                <p className="text-[11px] text-center mb-3 mt-1" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                  {LEVELS[end.level].boss ? `You bested ${LEVELS[end.level].boss}.` : "A flawless climb."}
                  {end.level === "easy" ? " Ready for The Foreman?" : " Now face The Architect."}
                </p>
              )}

              {/* Loss → motivation + quote */}
              {!end.won && (
                <div className="w-full text-center my-3">
                  <p
                    className="text-sm italic leading-relaxed mb-2"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}
                  >
                    &ldquo;{quote.q}&rdquo;
                  </p>
                  <Mono className="block text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: "#b7a98a" }}>
                    — {quote.a}
                  </Mono>
                  <p className="text-[11px]" style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}>
                    Dust off the mortar. Try again.
                  </p>
                </div>
              )}

              {/* Name entry */}
              <div className="w-full mt-1">
                <Mono className="block text-[11px] tracking-[0.2em] uppercase mb-1.5" style={{ color: "#b7a98a" }}>
                  Sign the ledger
                </Mono>
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submitScore(); }}
                    maxLength={18}
                    placeholder="Your name"
                    disabled={submitted}
                    className="flex-1 min-w-0 px-3 py-2 text-[12px] outline-none"
                    style={{
                      background: "#1e1810",
                      border: "1px solid rgba(201,168,76,0.25)",
                      color: "#f0e8d8",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  />
                  <button
                    onClick={submitScore}
                    disabled={submitted}
                    className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-3 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-60"
                    style={{ background: submitted ? "#1a3a1a" : "#c9a84c", color: submitted ? "#6abf6a" : "#080604", fontFamily: "'Outfit', sans-serif" }}
                  >
                    {submitted ? <><Check size={11} /> Saved</> : "Save"}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => startGame(end.level)}
                  className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 transition-all duration-200 hover:scale-105"
                  style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
                >
                  <RotateCcw size={11} /> Play Again
                </button>
                <button
                  onClick={() => setPhase("select")}
                  className="text-[11px] tracking-widest uppercase transition-colors duration-200"
                  style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif", borderBottom: "1px solid #2a2218" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a84c")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#b7a98a")}
                >
                  Change Level
                </button>
              </div>
            </div>
          )}
        </div>

        <p
          className="text-[11px] tracking-[0.25em] uppercase"
          style={{ color: "rgba(183,169,138,0.82)", fontFamily: "'Outfit', sans-serif" }}
        >
          {phase === "playing"
            ? LEVELS[stateRef.current.level].bombEvery > 0
              ? "Place to defuse bombs · avoid the block"
              : "Click · Space · Enter to drop"
            : "Click · Space · Enter to drop"}
        </p>
      </div>
    </div>
  );
}

// ── ProductCard Component ──────────────────────────────────────────
function ProductCard({
  product,
  onAdd,
  added,
  index,
}: {
  product: (typeof PRODUCTS)[0];
  onAdd: () => void;
  added: boolean;
  index: number;
}) {
  return (
    <motion.div
      className="group relative flex flex-col border border-[rgba(201,168,76,0.1)] bg-card overflow-hidden cursor-default transition-colors duration-500 hover:border-[rgba(201,168,76,0.35)]"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: index * 0.08 }}
    >
      {/* Lot ribbon — top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}
      >
        <Mono className="text-[11px] tracking-[0.2em]" style={{ color: "#c9a84c" }}>
          LOT&nbsp;{product.lot}
        </Mono>
        {product.tag ? (
          <Mono className="text-[11px] tracking-[0.2em] px-2 py-0.5" style={{ color: "#080604", background: "#c9a84c" }}>
            {product.tag}
          </Mono>
        ) : (
          <Mono className="text-[11px] tracking-[0.2em]" style={{ color: "#b7a98a" }}>
            {product.origin}
          </Mono>
        )}
      </div>

      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/5] bg-[#0d0b08]">
        <ImageWithFallback
          src={product.img}
          alt={`${product.name} — ${product.edition}`}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105"
          style={{ transition: "transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease" }}
        />
        {product.slideImg && (
          <ImageWithFallback
            src={product.slideImg}
            alt={`${product.name} — alternate view`}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 group-hover:scale-105"
            style={{ transition: "transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#110e09] via-transparent to-transparent pointer-events-none" />
        {/* Spec strip on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-500"
          style={{ background: "rgba(8,6,4,0.85)", backdropFilter: "blur(4px)" }}
        >
          <Mono className="text-[11px] tracking-wider" style={{ color: "#b7a98a" }}>
            {product.dims}
          </Mono>
          <Mono className="text-[11px] tracking-wider" style={{ color: "#b7a98a" }}>
            {product.mass}
          </Mono>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <p
          className="text-[11px] tracking-[0.25em] uppercase mb-1.5"
          style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
        >
          {product.edition}
        </p>
        <h3
          className="text-xl mb-2"
          style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={11}
              style={
                i < Math.floor(product.rating)
                  ? { color: "#c9a84c", fill: "#c9a84c" }
                  : { color: "#2a2218", fill: "#2a2218" }
              }
            />
          ))}
          <Mono className="text-[11px] ml-1" style={{ color: "#b7a98a" }}>
            ({product.reviews.toLocaleString()})
          </Mono>
        </div>

        <p
          className="text-[13px] leading-relaxed mb-6 flex-1"
          style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
        >
          {product.desc}
        </p>

        <div
          className="mt-auto flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between"
          style={{ borderTop: "1px solid rgba(201,168,76,0.08)" }}
        >
          <div>
            <Mono className="block text-[11px] tracking-[0.2em] mb-0.5" style={{ color: "#b7a98a" }}>
              PRICE
            </Mono>
            <span
              className="text-2xl"
              style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c" }}
            >
              ${product.price}
            </span>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex w-full items-center justify-center text-[11px] font-bold tracking-widest uppercase px-4 py-2.5 transition-all duration-300 sm:w-auto"
            style={{
              fontFamily: "'Outfit', sans-serif",
              background: added ? "#1a3a1a" : "transparent",
              color: added ? "#6abf6a" : "#c9a84c",
              border: added ? "1px solid #2a5a2a" : "1px solid #c9a84c",
            }}
            onMouseEnter={(e) => {
              if (!added) {
                (e.currentTarget as HTMLButtonElement).style.background = "#c9a84c";
                (e.currentTarget as HTMLButtonElement).style.color = "#080604";
              }
            }}
            onMouseLeave={(e) => {
              if (!added) {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#c9a84c";
              }
            }}
          >
            {added ? (
              <span className="flex items-center gap-1.5">
                <Check size={11} /> ADDED
              </span>
            ) : (
              "BUY NOW"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Interactive 3D BRIQ brick (CSS 3D, drag to rotate) ─────────────
const BRICK_3D_COLORS = [
  {
    name: "Red",
    swatch: "#9b3f20",
    face: "linear-gradient(150deg, #b85a31 0%, #8f341a 52%, #592011 100%)",
    hole: "radial-gradient(circle at 35% 30%, #351208, #0c0503)",
    note: "Iron-rich clay fired in oxygen.",
  },
  {
    name: "Orange",
    swatch: "#d26a2c",
    face: "linear-gradient(150deg, #e58a45 0%, #c45623 54%, #7c2d12 100%)",
    hole: "radial-gradient(circle at 35% 30%, #4a1707, #100503)",
    note: "Warm buff clay with lower iron.",
  },
  {
    name: "Buff",
    swatch: "#d9b66c",
    face: "linear-gradient(150deg, #efd58f 0%, #cda85a 56%, #8f6a2f 100%)",
    hole: "radial-gradient(circle at 35% 30%, #4d3514, #120d05)",
    note: "Calcium and sand create yellow tones.",
  },
  {
    name: "Brown",
    swatch: "#7a4b2a",
    face: "linear-gradient(150deg, #9b6a3f 0%, #6f3f21 55%, #392013 100%)",
    hole: "radial-gradient(circle at 35% 30%, #2a1308, #0b0503)",
    note: "Manganese and firing variation.",
  },
  {
    name: "Tan",
    swatch: "#c0a174",
    face: "linear-gradient(150deg, #dac096 0%, #b08d60 55%, #755734 100%)",
    hole: "radial-gradient(circle at 35% 30%, #473014, #100b05)",
    note: "Soft earthy neutral body.",
  },
  {
    name: "Pink",
    swatch: "#d49387",
    face: "linear-gradient(150deg, #ecb2a6 0%, #c7796f 54%, #85433d 100%)",
    hole: "radial-gradient(circle at 35% 30%, #4a1d1a, #110605)",
    note: "A lighter variant of red clay.",
  },
  {
    name: "Gray",
    swatch: "#8b8a81",
    face: "linear-gradient(150deg, #aaa99e 0%, #73736d 55%, #3a3a36 100%)",
    hole: "radial-gradient(circle at 35% 30%, #20201d, #080807)",
    note: "Modern ash-toned mineral body.",
  },
  {
    name: "Charcoal",
    swatch: "#2f312f",
    face: "linear-gradient(150deg, #555752 0%, #2e302e 55%, #111211 100%)",
    hole: "radial-gradient(circle at 35% 30%, #121312, #030303)",
    note: "Deep contemporary reduction tone.",
  },
  {
    name: "Cream",
    swatch: "#e5d7bd",
    face: "linear-gradient(150deg, #f4e8cf 0%, #d4bf94 55%, #9b8153 100%)",
    hole: "radial-gradient(circle at 35% 30%, #5e4928, #151006)",
    note: "White slurry or cement-rich finish.",
  },
  {
    name: "Black",
    swatch: "#10100f",
    face: "linear-gradient(150deg, #2c2b28 0%, #11110f 58%, #030303 100%)",
    hole: "radial-gradient(circle at 35% 30%, #070707, #000)",
    note: "Heavy reduction or manganese additive.",
  },
  {
    name: "Blue",
    swatch: "#1f4b78",
    face: "linear-gradient(150deg, #3f79aa 0%, #1f4b78 54%, #10263f 100%)",
    hole: "radial-gradient(circle at 35% 30%, #0d1d31, #02060a)",
    note: "Dense engineering or glazed finish.",
  },
  {
    name: "Glazed",
    swatch: "#3f8f68",
    face: "linear-gradient(150deg, #69c693 0%, #2f855f 48%, #16533a 100%)",
    hole: "radial-gradient(circle at 35% 30%, #0e2b1d, #020805)",
    note: "Custom decorative glazed color.",
  },
];

function Brick3D() {
  const [rot, setRot] = useState({ x: -16, y: 28 });
  const [material, setMaterial] = useState(BRICK_3D_COLORS[0]);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const spin = useRef({ x: 0, y: 0.28 });
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (!dragging.current) {
        setRot((r) => ({
          x: Math.max(-85, Math.min(85, r.x + spin.current.x)),
          y: r.y + spin.current.y,
        }));
        spin.current.x *= 0.94;
        spin.current.y += (0.28 - spin.current.y) * 0.035;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      spin.current = { x: -dy * 0.06, y: dx * 0.06 };
      setRot((r) => ({
        x: Math.max(-85, Math.min(85, r.x - dy * 0.5)),
        y: r.y + dx * 0.5,
      }));
    };
    const onUp = () => {
      dragging.current = false;
      if (Math.abs(spin.current.y) < 0.18) spin.current.y = spin.current.y < 0 ? -0.28 : 0.28;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onDown = (e: ReactPointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };

  // Brick dimensions (px)
  const L = 280, H = 110, D = 110;
  const hL = L / 2, hH = H / 2, hD = D / 2;

  const brickFace = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    background: material.face,
    boxShadow: "inset 0 0 28px rgba(0,0,0,0.5), inset 0 3px 0 rgba(255,255,255,0.08)",
    border: "1px solid rgba(0,0,0,0.35)",
    ...extra,
  });

  const logoOnFace: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="flex flex-col items-center select-none" style={{ perspective: "1100px" }}>
      <div
        data-cursor
        onPointerDown={onDown}
        className="cursor-grab active:cursor-grabbing"
        style={{
          width: L,
          height: H,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          touchAction: "none",
        }}
      >
        {/* Front */}
        <div style={brickFace({ width: L, height: H, marginLeft: -hL, marginTop: -hH, transform: `translateZ(${hD}px)` })}>
          <div style={logoOnFace}>
            <img src={logoBriq} alt="BRIQ" style={{ height: 46, filter: "invert(1) sepia(1) saturate(420%) hue-rotate(2deg) brightness(0.95)", opacity: 0.92 }} />
          </div>
        </div>
        {/* Back */}
        <div style={brickFace({ width: L, height: H, marginLeft: -hL, marginTop: -hH, transform: `rotateY(180deg) translateZ(${hD}px)` })}>
          <div style={logoOnFace}>
            <img src={logoBriq} alt="" aria-hidden style={{ height: 46, filter: "invert(1) sepia(1) saturate(420%) hue-rotate(2deg) brightness(0.95)", opacity: 0.92 }} />
          </div>
        </div>
        {/* Right (with frog/holes) */}
        <div style={brickFace({ width: D, height: H, marginLeft: -hD, marginTop: -hH, transform: `rotateY(90deg) translateZ(${hL}px)` })}>
          <div style={{ position: "absolute", inset: 0, display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: material.hole, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)" }} />
            ))}
          </div>
        </div>
        {/* Left (holes) */}
        <div style={brickFace({ width: D, height: H, marginLeft: -hD, marginTop: -hH, transform: `rotateY(-90deg) translateZ(${hL}px)` })}>
          <div style={{ position: "absolute", inset: 0, display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: material.hole, boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)" }} />
            ))}
          </div>
        </div>
        {/* Top */}
        <div style={brickFace({ width: L, height: D, marginLeft: -hL, marginTop: -hD, transform: `rotateX(90deg) translateZ(${hH}px)` })}>
          <div style={logoOnFace}>
            <img src={logoBriq} alt="" aria-hidden style={{ height: 40, filter: "invert(1) sepia(1) saturate(420%) hue-rotate(2deg) brightness(1.05)", opacity: 0.5 }} />
          </div>
        </div>
        {/* Bottom */}
        <div style={brickFace({ width: L, height: D, marginLeft: -hL, marginTop: -hD, transform: `rotateX(-90deg) translateZ(${hH}px)` })} />
      </div>

      <div className="mt-14 flex max-w-xl flex-wrap items-center justify-center gap-3">
        {BRICK_3D_COLORS.map((color) => {
          const active = color.name === material.name;
          return (
            <button
              key={color.name}
              type="button"
              aria-label={`Use ${color.name} brick color`}
              title={`${color.name} - ${color.note}`}
              onClick={() => setMaterial(color)}
              className="group relative flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
              style={{
                border: active ? "2px solid #c9a84c" : "1px solid rgba(240,232,216,0.28)",
                boxShadow: active ? "0 0 0 4px rgba(201,168,76,0.16)" : "0 6px 18px rgba(0,0,0,0.28)",
              }}
            >
              <span
                className="block h-6 w-6 rounded-full"
                style={{
                  background: color.face,
                  boxShadow: "inset 0 2px 5px rgba(255,255,255,0.18), inset 0 -4px 8px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-5 min-h-[46px] text-center">
        <Mono className="block text-[11px] tracking-[0.24em] uppercase" style={{ color: "#c9a84c" }}>
          {material.name}
        </Mono>
        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
          {material.note}
        </p>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────
const FOOTER_PANELS = {
  Privacy: {
    title: "Privacy",
    kicker: "Data & discretion",
    body: [
      "BRIQ keeps this storefront intentionally light: cart contents and game scores stay in the browser session unless you submit them.",
      "We do not sell collector information. Purchase and delivery details should only be shared through the checkout or concierge channels you choose.",
    ],
  },
  Terms: {
    title: "Terms",
    kicker: "Collector terms",
    body: [
      "All pieces are represented as limited architectural objects. Availability, pricing, and edition details may change until checkout is complete.",
      "Game rewards and leaderboard entries are promotional experiences and do not guarantee inventory, discounts, or delivery priority.",
    ],
  },
  Contact: {
    title: "Contact",
    kicker: "Concierge desk",
    body: [
      "For private viewings, trade questions, or custom glazed commissions, contact the BRIQ concierge.",
      "Typical response window is one business day.",
    ],
    action: "mailto:concierge@briq.example",
  },
} as const;

type FooterPanel = keyof typeof FOOTER_PANELS;

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
};

export default function App() {
  const [cart, setCart] = useState<{ id: number; lot: string; name: string; price: number; img: string; qty: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [purchase, setPurchase] = useState<{ items: number; total: number; quote: string; customer: CustomerDetails } | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [gameOpen, setGameOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [footerPanel, setFooterPanel] = useState<FooterPanel | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(EMPTY_CUSTOMER_DETAILS);

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const cartTotal = cart.reduce((n, i) => n + i.qty * i.price, 0);
  const activeFooterPanel = footerPanel ? FOOTER_PANELS[footerPanel] : null;
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; flag: string }[]>([
    { id: "p1", name: "A. Pemberton", score: 47, flag: "🇬🇧" },
    { id: "p2", name: "M. Sato", score: 41, flag: "🇯🇵" },
    { id: "p3", name: "C. Beaumont", score: 38, flag: "🇫🇷" },
  ]);

  const handleGameOver = (score: number, name: string, won: boolean, level: Level) => {
    const clean = (name || "").trim() || "Anonymous";
    const id = "you:" + clean.toLowerCase();
    const flag = won && level === "hard" ? "👑" : "🏆";
    setLeaderboard((prev) => {
      const existing = prev.find((r) => r.id === id);
      let next;
      if (existing) {
        // Keep the player's personal best for this name
        next = prev.map((r) => (r.id === id ? { ...r, score: Math.max(r.score, score), flag } : r));
      } else {
        next = [...prev, { id, name: clean, score, flag }];
      }
      return [...next].sort((a, b) => b.score - a.score).slice(0, 8);
    });
  };

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAdd = (product: (typeof PRODUCTS)[number]) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: product.id, lot: product.lot, name: product.name, price: product.price, img: product.img, qty: 1 }];
    });
    setAddedIds((prev) => new Set([...prev, product.id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1800);
  };

  const updateQty = (id: number, delta: number) =>
    setCart((prev) =>
      prev.flatMap((i) => (i.id === id ? (i.qty + delta <= 0 ? [] : [{ ...i, qty: i.qty + delta }]) : [i]))
    );

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleCheckout = () => {
    if (!cart.length) return;
    setCheckoutOpen(true);
    setCartOpen(false);
  };

  const handleConfirmOrder = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cart.length) return;
    setPurchase({
      items: cartCount,
      total: cartTotal,
      quote: CHECKOUT_QUOTES[Math.floor(Math.random() * CHECKOUT_QUOTES.length)],
      customer: {
        name: customerDetails.name.trim(),
        email: customerDetails.email.trim(),
        phone: customerDetails.phone.trim(),
        address: customerDetails.address.trim(),
        city: customerDetails.city.trim(),
      },
    });
    setCart([]);
    setCheckoutOpen(false);
    setCustomerDetails(EMPTY_CUSTOMER_DETAILS);
  };

  return (
    <div
      style={{ background: "#080604", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
      className="min-h-screen overflow-x-hidden"
    >
      {/* ── Global CSS ── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 28s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080604; }
        ::-webkit-scrollbar-thumb { background: #2a2218; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #c9a84c33; }
        ::selection { background: #c9a84c; color: #080604; }
        @media (hover: hover) and (pointer: fine) {
          * { cursor: none !important; }
        }
      `}</style>

      <GrainOverlay />
      <CustomCursor />

      {gameOpen && <BrickGame onClose={() => setGameOpen(false)} onGameOver={handleGameOver} />}

      {activeFooterPanel && footerPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          onClick={(e) => e.target === e.currentTarget && setFooterPanel(null)}
        >
          <div className="absolute inset-0" style={{ background: "rgba(8,6,4,0.78)", backdropFilter: "blur(3px)" }} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-panel-title"
            className="relative w-full max-w-md p-7"
            style={{ background: "#0d0b08", border: "1px solid rgba(201,168,76,0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => setFooterPanel(null)}
              className="absolute right-4 top-4 text-[#b7a98a] transition-colors hover:text-[#c9a84c]"
              aria-label={`Close ${activeFooterPanel.title}`}
            >
              <X size={18} />
            </button>
            <Mono className="block text-[11px] tracking-[0.28em] uppercase mb-3" style={{ color: "#c9a84c" }}>
              {activeFooterPanel.kicker}
            </Mono>
            <h3 id="footer-panel-title" className="text-3xl mb-5" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
              {activeFooterPanel.title}
            </h3>
            <div className="space-y-4">
              {activeFooterPanel.body.map((line) => (
                <p key={line} className="text-[14px] leading-relaxed" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                  {line}
                </p>
              ))}
            </div>
            {"action" in activeFooterPanel && activeFooterPanel.action && (
              <a
                href={activeFooterPanel.action}
                className="mt-7 inline-flex text-[11px] font-bold tracking-widest uppercase px-6 py-3 transition-all duration-300 hover:scale-105"
                style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
              >
                Email Concierge
              </a>
            )}
          </motion.div>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(8,6,4,0.7)", backdropFilter: "blur(2px)" }} />
          <motion.aside
            className="relative h-full w-full max-w-md flex flex-col"
            style={{ background: "#0d0b08", borderLeft: "1px solid rgba(201,168,76,0.18)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "tween", duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
              <div className="flex items-center gap-3">
                <ShoppingCart size={16} style={{ color: "#c9a84c" }} />
                <Mono className="text-[11px] tracking-[0.3em] uppercase" style={{ color: "#c9a84c" }}>
                  Your Acquisitions ({cartCount})
                </Mono>
              </div>
              <button onClick={() => setCartOpen(false)} className="text-[#b7a98a] hover:text-[#c9a84c] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
                  <ShoppingCart size={40} style={{ color: "#2a2218" }} />
                  <p className="text-[15px]" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                    Your collection awaits its first piece.
                  </p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="text-[11px] font-bold tracking-widest uppercase px-6 py-3"
                    style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
                  >
                    Browse Lots
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                    <div className="w-16 h-16 shrink-0 overflow-hidden bg-[#1e1810]">
                      <ImageWithFallback src={item.img} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Mono className="block text-[11px] tracking-[0.2em] uppercase mb-0.5" style={{ color: "#b7a98a" }}>
                        Lot {item.lot}
                      </Mono>
                      <p className="text-sm truncate" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center" style={{ border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center text-[13px]" style={{ color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center" style={{ border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}>
                            <Plus size={11} />
                          </button>
                        </div>
                        <span className="text-sm" style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c" }}>
                          ${item.price * item.qty}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-[#b7a98a] hover:text-[#e07a5f] transition-colors self-start">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="flex items-center justify-between mb-4">
                  <Mono className="text-[11px] tracking-[0.25em] uppercase" style={{ color: "#b7a98a" }}>Subtotal</Mono>
                  <span className="text-2xl" style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c" }}>${cartTotal}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full text-[11px] font-bold tracking-widest uppercase py-4 transition-all duration-300 hover:scale-[1.02]"
                  style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
                >
                  Checkout · ${cartTotal}
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}

      {/* ── CHECKOUT SUCCESS ── */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-5"
          style={{ background: "rgba(8,6,4,0.92)" }}
          onClick={(e) => e.target === e.currentTarget && setCheckoutOpen(false)}
        >
          <motion.form
            onSubmit={handleConfirmOrder}
            className="relative w-full max-w-lg p-7 sm:p-8"
            style={{ background: "#0d0b08", border: "1px solid rgba(201,168,76,0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
              className="absolute right-4 top-4 text-[#b7a98a] transition-colors hover:text-[#c9a84c]"
              aria-label="Close checkout details"
            >
              <X size={18} />
            </button>

            <Mono className="block text-[11px] tracking-[0.28em] uppercase mb-3" style={{ color: "#c9a84c" }}>
              Collector Details
            </Mono>
            <h3 className="text-3xl mb-3 leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
              Confirm delivery details.
            </h3>
            <p className="text-[13px] leading-relaxed mb-6" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
              Add your contact and delivery information before the order is confirmed.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-left sm:col-span-2">
                <Mono className="block text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "#b7a98a" }}>Full Name</Mono>
                <input
                  required
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: "#080604", border: "1px solid rgba(201,168,76,0.18)", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
                  placeholder="Collector name"
                />
              </label>
              <label className="block text-left">
                <Mono className="block text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "#b7a98a" }}>Email</Mono>
                <input
                  required
                  type="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails((d) => ({ ...d, email: e.target.value }))}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: "#080604", border: "1px solid rgba(201,168,76,0.18)", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
                  placeholder="name@example.com"
                />
              </label>
              <label className="block text-left">
                <Mono className="block text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "#b7a98a" }}>Phone</Mono>
                <input
                  required
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails((d) => ({ ...d, phone: e.target.value }))}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: "#080604", border: "1px solid rgba(201,168,76,0.18)", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
                  placeholder="+1 555 000 0000"
                />
              </label>
              <label className="block text-left sm:col-span-2">
                <Mono className="block text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "#b7a98a" }}>Delivery Address</Mono>
                <textarea
                  required
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails((d) => ({ ...d, address: e.target.value }))}
                  className="min-h-[92px] w-full resize-none px-4 py-3 text-sm outline-none"
                  style={{ background: "#080604", border: "1px solid rgba(201,168,76,0.18)", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
                  placeholder="Street address, apartment, delivery notes"
                />
              </label>
              <label className="block text-left sm:col-span-2">
                <Mono className="block text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "#b7a98a" }}>City / Region</Mono>
                <input
                  required
                  value={customerDetails.city}
                  onChange={(e) => setCustomerDetails((d) => ({ ...d, city: e.target.value }))}
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={{ background: "#080604", border: "1px solid rgba(201,168,76,0.18)", color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}
                  placeholder="City, state, postal code"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setCheckoutOpen(false);
                  setCartOpen(true);
                }}
                className="w-full text-[11px] tracking-widest uppercase py-3.5 transition-colors duration-200"
                style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif", border: "1px solid rgba(201,168,76,0.35)" }}
              >
                Back to Cart
              </button>
              <button
                type="submit"
                className="w-full text-[11px] font-bold tracking-widest uppercase py-3.5 transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
              >
                Confirm Order · ${cartTotal}
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {purchase && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-6" style={{ background: "rgba(8,6,4,0.94)" }} onClick={(e) => e.target === e.currentTarget && setPurchase(null)}>
          <motion.div
            className="relative w-full max-w-md text-center p-10"
            style={{ background: "#0d0b08", border: "1px solid rgba(201,168,76,0.22)" }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <button onClick={() => setPurchase(null)} className="absolute top-4 right-4 text-[#b7a98a] hover:text-[#c9a84c] transition-colors">
              <X size={18} />
            </button>

            <motion.div
              className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            >
              <Check size={28} style={{ color: "#c9a84c" }} />
            </motion.div>

            <Mono className="block text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "#c9a84c" }}>
              Order Confirmed
            </Mono>
            <h3 className="text-2xl mb-4 leading-snug" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
              You have successfully purchased one of the most valuable and wanted products in the world.
            </h3>
            <p className="text-[13px] leading-relaxed mb-6" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
              {purchase.items} {purchase.items === 1 ? "piece" : "pieces"} · ${purchase.total} · White-glove delivery within 3 days.
            </p>

            <div className="mb-6 p-4 text-left" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
              <Mono className="block text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "#c9a84c" }}>
                Delivery Contact
              </Mono>
              <p className="text-sm leading-relaxed" style={{ color: "#f0e8d8", fontFamily: "'Outfit', sans-serif" }}>
                {purchase.customer.name}
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                {purchase.customer.email} / {purchase.customer.phone}
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
                {purchase.customer.address}, {purchase.customer.city}
              </p>
            </div>

            <div className="p-4 mb-6" style={{ borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
              <p className="text-sm italic leading-relaxed" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
                &ldquo;{purchase.quote}&rdquo;
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPurchase(null); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
                className="w-full text-[11px] font-bold tracking-widest uppercase py-3.5 transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
              >
                Acquire Another
              </button>
              <button
                onClick={() => { setPurchase(null); setGameOpen(true); }}
                className="flex items-center justify-center gap-2 w-full text-[11px] tracking-widest uppercase py-3 transition-colors duration-200"
                style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif", border: "1px solid rgba(201,168,76,0.35)" }}
              >
                <Play size={12} /> Play The Stack & Win 50% Off
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 left-0 right-0 z-40 grid min-h-[108px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-2 sm:px-6 lg:min-h-[88px] lg:gap-x-6 lg:px-8"
        style={{
          background: "rgba(8,6,4,0.45)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid rgba(201,168,76,0.14)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="col-start-1 row-start-1 hidden items-center justify-self-end gap-8 pr-4 text-[12px] font-semibold uppercase leading-none tracking-[0.2em] lg:flex xl:gap-10 xl:pr-6" style={{ color: "#e3d7bd", fontFamily: "'Outfit', sans-serif" }}>
          <a href="#products" className="whitespace-nowrap transition-colors duration-200 hover:text-[#c9a84c]">Collection</a>
          <a href="#game" className="whitespace-nowrap transition-colors duration-200 hover:text-[#c9a84c]">The Stack</a>
        </div>

        <a
          href="#top"
          className="col-start-2 row-start-1 flex items-center justify-self-center"
        >
          <img
            src={logoBriq}
            alt="BRIQ"
            className="h-[64px] w-auto sm:h-[70px]"
            style={{ filter: "invert(1) sepia(1) saturate(420%) hue-rotate(2deg) brightness(0.95)" }}
          />
        </a>

        <div className="col-start-3 row-start-1 hidden items-center justify-self-start gap-8 pl-4 text-[12px] font-semibold uppercase leading-none tracking-[0.2em] lg:flex xl:gap-10 xl:pl-6" style={{ color: "#e3d7bd", fontFamily: "'Outfit', sans-serif" }}>
          <a href="#leaderboard" className="whitespace-nowrap transition-colors duration-200 hover:text-[#c9a84c]">Leaderboard</a>
          <a href="#about" className="whitespace-nowrap transition-colors duration-200 hover:text-[#c9a84c]">Provenance</a>
        </div>

        <div className="absolute right-4 top-6 flex items-center sm:right-6 sm:top-7 lg:right-8 lg:top-1/2 lg:-translate-y-1/2">
          <button className="relative group" onClick={() => setCartOpen(true)} aria-label="Open cart">
            <ShoppingCart
              size={20}
              className="transition-colors duration-200 group-hover:text-[#c9a84c]"
              style={{ color: "#f0e8d8" }}
            />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
              >
                {cartCount}
              </motion.span>
            )}
          </button>
        </div>

        <div className="col-span-3 row-start-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-semibold uppercase leading-none tracking-[0.14em] sm:text-[11px] sm:tracking-[0.16em] lg:hidden" style={{ color: "#e3d7bd", fontFamily: "'Outfit', sans-serif" }}>
          <a href="#products" className="hover:text-[#c9a84c] transition-colors duration-200">Collection</a>
          <a href="#game" className="hover:text-[#c9a84c] transition-colors duration-200">Stack</a>
          <a href="#leaderboard" className="hover:text-[#c9a84c] transition-colors duration-200">Leaderboard</a>
          <a href="#about" className="hover:text-[#c9a84c] transition-colors duration-200">Provenance</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: "#b3a48f" }}
      >
        {/* Branded campaign banner */}
        <motion.div
          className="relative w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          <ImageWithFallback
            src={heroBanner}
            alt="BRIQ — Raw material. Refined presence. A limited collection of architectural objects."
            className="block h-auto w-full"
          />

          <motion.div
            className="absolute inset-x-0 bottom-[clamp(0.75rem,3vw,3.25rem)] z-10 flex flex-col items-center gap-3 px-4 sm:gap-4 sm:px-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6 }}
          >
            <motion.div
              className="pointer-events-none flex flex-col items-center gap-1.5 sm:gap-2"
              animate={{ opacity: [0.45, 1, 0.45], y: [0, 10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="h-7 w-px sm:h-10"
                style={{ background: "linear-gradient(to bottom, transparent, #c9a84c)" }}
              />
              <ChevronDown size={20} strokeWidth={1.7} style={{ color: "#c9a84c" }} />
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              <a
                href="#products"
                className="flex h-[46px] min-w-[190px] items-center justify-center text-[10px] font-bold tracking-[0.14em] uppercase transition-all duration-300 hover:scale-105 hover:shadow-lg sm:h-[62px] sm:min-w-[260px] sm:text-[12px] sm:tracking-[0.16em] md:h-[70px] md:min-w-[300px] md:text-[13px]"
                style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
              >
                View the Collection
              </a>
              <button
                onClick={() => setGameOpen(true)}
                className="flex h-[46px] items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase transition-colors duration-200 sm:h-[62px] sm:text-[12px] sm:tracking-[0.16em] md:h-[70px] md:text-[13px]"
                style={{ color: "#f0e8d8", fontFamily: "'Outfit', sans-serif", borderBottom: "1px solid rgba(201,168,76,0.5)", textShadow: "0 1px 12px rgba(8,6,4,0.45)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#c9a84c")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#f0e8d8")}
              >
                <Play size={15} /> Play The Stack
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div
        className="overflow-hidden py-3"
        style={{ background: "#0d0b08", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}
      >
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((text, i) => (
            <span
              key={i}
              className="flex items-center"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              <span className="text-[11px] tracking-[0.3em] uppercase mx-8">{text}</span>
              <span className="text-[#c9a84c] mx-3">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section
        className="px-5 py-12 sm:px-8 sm:py-16"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.06)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-8 text-center md:grid-cols-4 md:gap-10">
          {[
            { num: "2,847", label: "Bricks Acquired" },
            { num: "4.9", label: "Collector Rating" },
            { num: "94", label: "Countries" },
            { num: "100%", label: "Satisfaction" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div
                className="mb-1.5 text-3xl sm:text-4xl"
                style={{ fontFamily: "'Playfair Display', serif", color: "#c9a84c" }}
              >
                {stat.num}
              </div>
              <div className="text-[11px] tracking-[0.25em] uppercase" style={{ color: "#b7a98a" }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
            <div>
              <Mono className="block text-[11px] tracking-[0.18em] uppercase leading-relaxed mb-3 sm:tracking-[0.3em]" style={{ color: "#c9a84c" }}>
                Lots 001 — 009 / The Spring Catalogue
              </Mono>
              <h2
                className="text-4xl md:text-5xl leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Select Your<br />
                <em className="italic" style={{ color: "#c9a84c" }}>Statement Piece.</em>
              </h2>
            </div>
            <p
              className="text-[15px] leading-relaxed max-w-xs"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              Nine lots. Each a distinct expression of the permanent object. Available now for immediate acquisition.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {PRODUCTS.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => handleAdd(product)}
                added={addedIds.has(product.id)}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── LOOKBOOK ── */}
      <section className="px-5 py-16 sm:px-8 sm:py-24" style={{ borderTop: "1px solid rgba(201,168,76,0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex flex-col justify-between gap-6 md:mb-12 md:flex-row md:items-end">
            <div>
              <Mono className="block text-[11px] tracking-[0.18em] uppercase leading-relaxed mb-3 sm:tracking-[0.3em]" style={{ color: "#c9a84c" }}>
                Editorial / SS24
              </Mono>
              <h2 className="text-4xl md:text-5xl leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                The <em className="italic" style={{ color: "#c9a84c" }}>Lookbook.</em>
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed max-w-xs" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
              A permanent object, photographed in its natural habitat — the trunk of a coupé, the hands of an heir.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.9fr_1fr] md:items-start">
            {/* Tall feature */}
            {[
              { img: heroImage, label: "01 / The Collector", title: "Carried by hand", tall: true },
            ].map((item) => (
              <motion.figure
                key={item.label}
                className="group relative aspect-[2/3] overflow-hidden bg-[#0d0b08]"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7 }}
              >
                <ImageWithFallback
                  src={item.img}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  style={{ transition: "transform 900ms cubic-bezier(0.16,1,0.3,1)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080604] via-transparent to-transparent pointer-events-none" />
                <figcaption className="absolute bottom-0 left-0 right-0 p-6">
                  <Mono className="block text-[11px] tracking-[0.25em] uppercase mb-1" style={{ color: "#c9a84c" }}>
                    {item.label}
                  </Mono>
                  <p className="text-2xl" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
                    {item.title}
                  </p>
                </figcaption>
              </motion.figure>
            ))}

            {/* Stacked pair */}
            <div className="grid gap-4 md:grid-rows-2">
              {[
                { img: editorialMercedes, label: "02 / The Grand Tourer", title: "250 C, with cargo", pos: "object-top" },
                { img: editorialExchange, label: "03 / The Exchange", title: "Acquired, then passed down", pos: "object-center" },
              ].map((item) => (
                <motion.figure
                  key={item.label}
                  className={`group relative overflow-hidden bg-[#0d0b08] ${item.label.startsWith("02") ? "aspect-[1085/1450]" : "aspect-[2/3]"}`}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  <ImageWithFallback
                    src={item.img}
                    alt={item.title}
                    className={`absolute inset-0 w-full h-full object-cover ${item.pos}`}
                    style={{ transition: "transform 900ms cubic-bezier(0.16,1,0.3,1)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080604] via-transparent to-transparent pointer-events-none" />
                  <figcaption className="absolute bottom-0 left-0 right-0 p-6">
                    <Mono className="block text-[11px] tracking-[0.25em] uppercase mb-1" style={{ color: "#c9a84c" }}>
                      {item.label}
                    </Mono>
                    <p className="text-xl" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>
                      {item.title}
                    </p>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PARALLAX PROVENANCE SECTION ── */}
      <section id="about" className="relative h-[55vh] min-h-[400px] overflow-hidden flex items-center">
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${scrollY * 0.18}px) scale(1.1)`,
            transformOrigin: "center",
          }}
        >
          <ImageWithFallback
            src={brick1Slide}
            alt="A collector presenting the Crimson Classic"
            className="w-full h-full object-cover object-center"
            style={{ opacity: 0.4 }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, #080604 0%, rgba(8,6,4,0.55) 50%, #080604 100%)" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <p
              className="text-[11px] tracking-[0.2em] uppercase leading-relaxed mb-6 sm:tracking-[0.45em]"
              style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}
            >
              Provenance
            </p>
            <h2
              className="text-4xl md:text-6xl mb-8 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Crafted for<br />
              <em className="italic" style={{ color: "#c9a84c" }}>Legacy.</em>
            </h2>
            <p
              className="text-[15px] leading-[1.9] max-w-lg mx-auto"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              Every BRIQ piece begins as raw earth. It is transformed through fire, pressure, and the hands of artisans who have worked clay for generations. The result is not simply a brick. It is an object with a biography.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 3D INTERACTIVE BRICK (end of Provenance) ── */}
      <section className="relative py-24 px-8 overflow-hidden" style={{ background: "#080604" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: "radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, rgba(8,6,4,0) 65%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Mono className="block text-[11px] tracking-[0.2em] uppercase leading-relaxed mb-3 sm:tracking-[0.35em]" style={{ color: "#c9a84c" }}>
              Examine the Object
            </Mono>
            <h2 className="text-3xl md:text-4xl mb-10 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Turn it over in your <em className="italic" style={{ color: "#c9a84c" }}>hands.</em>
            </h2>

            <div className="flex justify-center my-6" style={{ minHeight: 200 }}>
              <Brick3D />
            </div>

            <p className="text-[11px] tracking-[0.25em] uppercase mt-8" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
              Drag to rotate · choose a fired finish
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES BAR ── */}
      <section
        className="py-14 px-8"
        style={{ background: "#0d0b08", borderTop: "1px solid rgba(201,168,76,0.06)", borderBottom: "1px solid rgba(201,168,76,0.06)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: "✦", title: "Certificate of Singularity", body: "Every brick ships with a hand-signed certificate attesting to its uniqueness. No two bricks are identical." },
            { icon: "◈", title: "White Glove Delivery", body: "Transported in a linen-lined oak crate, handled only by our trained logistics partners." },
            { icon: "⬡", title: "Lifetime Provenance", body: "Scan the embedded NFC chip at any time to access your brick's full firing history and chain of custody." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
            >
              <div
                className="text-2xl mb-4"
                style={{ color: "#c9a84c" }}
              >
                {f.icon}
              </div>
              <h4
                className="text-base mb-2"
                style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}
              >
                {f.title}
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: "#b7a98a" }}>
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── THE DROP (promo) ── */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:py-24" style={{ background: "#0d0b08", borderTop: "1px solid rgba(201,168,76,0.06)", borderBottom: "1px solid rgba(201,168,76,0.06)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 md:items-start">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Mono className="block text-[11px] tracking-[0.18em] uppercase leading-relaxed mb-4 sm:tracking-[0.3em]" style={{ color: "#c9a84c" }}>
              The Drop / 29 Nov
            </Mono>
            <h2 className="text-4xl md:text-5xl leading-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Better than<br />
              <em className="italic" style={{ color: "#c9a84c" }}>black friday.</em>
            </h2>
            <p className="text-[15px] leading-[1.9] mb-8 max-w-sm" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
              Four faces, one weekend. Two on-demand, two in-stock — each pressed in a numbered run and gone when the kiln cools. No restocks. No exceptions.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-8">
              <div>
                <Mono className="block text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: "#b7a98a" }}>On-Demand</Mono>
                <span className="text-lg" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>2 faces</span>
              </div>
              <div className="w-px h-8" style={{ background: "rgba(201,168,76,0.2)" }} />
              <div>
                <Mono className="block text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: "#b7a98a" }}>In-Stock</Mono>
                <span className="text-lg" style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}>2 faces</span>
              </div>
            </div>
            <a
              href="#products"
              className="inline-block text-[11px] font-bold tracking-widest uppercase px-8 py-4 transition-all duration-300 hover:scale-105"
              style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
            >
              Reserve Your Lot
            </a>
          </motion.div>

          {/* Flatlay */}
          <motion.div
            className="relative aspect-[941/1671] overflow-hidden border"
            style={{ borderColor: "rgba(201,168,76,0.12)" }}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <ImageWithFallback
              src={dropFlatlay}
              alt="BRIQ — Better than black friday. Four brick faces, on-demand and in-stock."
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </motion.div>
        </div>
      </section>

      {/* ── GAME SECTION ── */}
      <section id="game" className="py-28 px-8 relative overflow-hidden">
        {/* Background grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(201,168,76,0.03) 0px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(201,168,76,0.03) 0px, transparent 1px, transparent 48px)",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p
              className="text-[11px] tracking-[0.2em] uppercase leading-relaxed mb-4 sm:tracking-[0.35em]"
              style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}
            >
              Interactive Game
            </p>
            <h2
              className="text-4xl md:text-5xl mb-5 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Master
              <br />
              <em className="italic" style={{ color: "#c9a84c" }}>The Stack.</em>
            </h2>
            <p
              className="text-[15px] leading-relaxed mb-10 max-w-sm mx-auto"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              Architecture is patience. Prove yours. Stack bricks with precision and earn a place among the collectors.
            </p>

            <button
              onClick={() => setGameOpen(true)}
              className="inline-flex items-center gap-3 text-[11px] font-bold tracking-widest uppercase px-12 py-5 transition-all duration-300 hover:scale-105"
              style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
            >
              <Play size={13} fill="#080604" />
              PLAY THE STACK
            </button>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              <span>Free to play</span>
              <span style={{ color: "#c9a84c" }}>·</span>
              <span>No account needed</span>
              <span style={{ color: "#c9a84c" }}>·</span>
              <span>Bragging rights included</span>
            </div>

            {/* Leaderboard teaser */}
            <div
              id="leaderboard"
              className="mt-14 border p-6 text-left scroll-mt-24"
              style={{ borderColor: "rgba(201,168,76,0.1)", background: "rgba(17,14,9,0.6)" }}
            >
              <div className="flex items-center justify-between mb-5">
                <span
                  className="text-[11px] tracking-[0.3em] uppercase"
                  style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
                >
                  Global Leaderboard
                </span>
                <Zap size={12} style={{ color: "#c9a84c" }} />
              </div>
              {leaderboard.map((row, idx) => {
                const isYou = row.id.startsWith("you:");
                const rank = idx + 1;
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between py-3 px-2 -mx-2 transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(201,168,76,0.06)",
                      background: isYou ? "rgba(201,168,76,0.08)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="text-[11px] w-4"
                        style={{ color: rank === 1 ? "#c9a84c" : "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
                      >
                        {rank}
                      </span>
                      <span
                        className="text-sm"
                        style={{ fontFamily: "'Playfair Display', serif", color: isYou ? "#c9a84c" : "#f0e8d8" }}
                      >
                        {row.flag} {row.name}
                      </span>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ fontFamily: "'Outfit', sans-serif", color: "#c9a84c" }}
                    >
                      {row.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section
        className="py-24 px-8"
        style={{ background: "#0d0b08", borderTop: "1px solid rgba(201,168,76,0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <p
            className="text-[11px] tracking-[0.2em] uppercase leading-relaxed mb-16 text-center sm:tracking-[0.35em]"
            style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}
          >
            Collector Testimonials
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, delay: i * 0.14 }}
              >
                <div
                  className="pt-8"
                  style={{ borderTop: "1px solid rgba(201,168,76,0.18)" }}
                >
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={10} style={{ color: "#c9a84c", fill: "#c9a84c" }} />
                    ))}
                  </div>
                  <p
                    className="text-lg italic leading-[1.7] mb-7"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#f0e8d8" }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}
                    >
                      {t.author}
                    </p>
                    <p
                      className="text-[11px] tracking-widest uppercase"
                      style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
                    >
                      {t.title}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-36 px-8 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, rgba(8,6,4,0) 70%), linear-gradient(180deg, #080604 0%, #0d0b08 50%, #080604 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(201,168,76,0.04) 0px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(201,168,76,0.04) 0px, transparent 1px, transparent 48px)",
          }}
        />

        <div className="relative z-10 max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <p
              className="text-[11px] tracking-[0.2em] uppercase leading-relaxed mb-6 sm:tracking-[0.45em]"
              style={{ color: "#c9a84c", fontFamily: "'Outfit', sans-serif" }}
            >
              Acquire
            </p>
            <h2
              className="text-5xl md:text-6xl leading-tight mb-8"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Own the<br />
              <em className="italic" style={{ color: "#c9a84c" }}>Extraordinary.</em>
            </h2>
            <p
              className="text-[15px] leading-[1.9] mb-12"
              style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}
            >
              A brick is a permanent thing. Once placed, it holds everything above it.<br />What will yours hold?
            </p>
            <a
              href="#products"
              className="inline-block text-[11px] font-bold tracking-widest uppercase px-14 py-5 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(201,168,76,0.2)]"
              style={{ background: "#c9a84c", color: "#080604", fontFamily: "'Outfit', sans-serif" }}
            >
              Shop the Collection
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-8"
        style={{ borderTop: "1px solid rgba(201,168,76,0.08)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img
            src={logoBriq}
            alt="BRIQ"
            className="h-[50px] w-auto"
            style={{ filter: "invert(1) sepia(1) saturate(420%) hue-rotate(2deg) brightness(0.95)" }}
          />
          <p
            className="text-[11px] tracking-widest uppercase text-center"
            style={{ color: "#86775d", fontFamily: "'Outfit', sans-serif" }}
          >
            &copy; 2026 BRIQ Maison de Brique. The World&apos;s Most Exclusive Brick. All rights reserved.
          </p>
          <div className="flex gap-7 text-[11px] tracking-widest uppercase" style={{ color: "#b7a98a", fontFamily: "'Outfit', sans-serif" }}>
            {(Object.keys(FOOTER_PANELS) as FooterPanel[]).map((link) => (
              <button
                key={link}
                type="button"
                onClick={() => setFooterPanel(link)}
                className="transition-colors duration-200 hover:text-[#c9a84c]"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
