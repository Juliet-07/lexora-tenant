import {
  FormEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { initView } from "./fx/view";
import { prefersReducedMotion } from "./fx/core";
import { useSite } from "./SiteLayout";

// "Get in touch": the PO's three-step request form, wired to the real
// demo-request backend (weekly availability set by the Super Admin, and
// POST /public/demo-requests). A backup time is also collected because the
// backend needs one to reschedule.

const SUBJECTS: { label: string; k: string }[] = [
  { label: "Book a demo", k: "demo" },
  { label: "Advisory services", k: "advisory" },
  { label: "Training programmes", k: "training" },
  { label: "Pricing and plans", k: "pricing" },
  { label: "GRC Health Score", k: "health" },
  { label: "Events", k: "events" },
  { label: "Partnerships", k: "partner" },
  { label: "General enquiry", k: "general" },
];
const INDUSTRIES = [
  "Professional services",
  "Project management",
  "Engineering, procurement and construction",
  "Real estate",
  "Manufacturing",
  "Natural resources",
  "Trade and distribution",
  "Service businesses",
  "Financial services",
  "SMEs",
  "Investment and deal advisory",
  "Fund managers",
  "Technology",
  "Other",
];
const SIZES = ["1 to 10", "11 to 50", "51 to 200", "201 to 500", "Over 500"];
const INTERESTS = [
  "Lexora AML/KYC",
  "Lexora Projects",
  "Lexora Finance",
  "Lexora GRC",
  "Lexora HR",
  "GRC Health Score",
  "Advisory services",
  "Training programmes",
];
const LBL = [
  "Continue to interests",
  "Continue to select a time",
  "Confirm and send",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface AvailDay {
  date: string;
  day: string;
  label: string;
  slots: string[];
}
interface Availability {
  timezone: string;
  durationMinutes: number;
  days: AvailDay[];
}

async function fetchAvailability(): Promise<Availability> {
  const res = await api.get("/public/demo-requests/availability");
  const d = res.data?.data ?? res.data;
  return d ?? { timezone: "CAT", durationMinutes: 30, days: [] };
}

const parts = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return { d, m: MONTHS[m - 1], y };
};

function DayPicker({
  days,
  name,
  value,
  onPick,
}: {
  days: AvailDay[];
  name: string;
  value: string;
  onPick: (date: string) => void;
}) {
  return (
    <div className="gd-row">
      {days.map((d) => {
        const p = parts(d.date);
        return (
          <label className="gd" key={d.date}>
            <input
              type="radio"
              name={name}
              value={d.date}
              checked={value === d.date}
              onChange={() => onPick(d.date)}
            />
            <span>
              <small>{d.day}</small>
              <b>{p.d}</b>
              <i>{p.m}</i>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function TimePicker({
  slots,
  name,
  value,
  onPick,
  disabledTime,
}: {
  slots: string[];
  name: string;
  value: string;
  onPick: (t: string) => void;
  disabledTime?: string;
}) {
  return (
    <div className="gtm-grid">
      {slots.map((t) => (
        <label className="gtm" key={t}>
          <input
            type="radio"
            name={name}
            value={t}
            checked={value === t}
            disabled={disabledTime === t}
            onChange={() => onPick(t)}
          />
          <span>{t}</span>
        </label>
      ))}
    </div>
  );
}

export default function ContactView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const site = useSite();
  const [params] = useSearchParams();
  const reduced = prefersReducedMotion();

  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    industry: "",
    companySize: "",
    subject: "",
    message: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [newsletter, setNewsletter] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");

  const { data: avail, isLoading: loadingSlots } = useQuery({
    queryKey: ["public-demo-availability"],
    queryFn: fetchAvailability,
    staleTime: 60_000,
  });
  const days = avail?.days ?? [];
  const slotsFor = (d: string) => days.find((x) => x.date === d)?.slots ?? [];

  // ?topic=demo etc. preselects the subject
  useEffect(() => {
    const k = params.get("topic");
    const s = SUBJECTS.find((x) => x.k === k);
    if (s) setF((p) => ({ ...p, subject: s.label }));
  }, [params]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    return initView(rootRef.current, {
      navigate: () => {},
      playing: site.playing,
      onPlay: site.onPlay,
      hash: "",
    });
  }, [site]);

  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setBad((b) => ({ ...b, [k]: false }));
    setErr("");
  };

  const fail = (msg: string, keys: string[] = []) => {
    setErr(msg);
    setBad(Object.fromEntries(keys.map((k) => [k, true])));
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    return false;
  };

  const validate = () => {
    setBad({});
    if (step === 0) {
      const miss: string[] = [];
      if (!f.firstName.trim()) miss.push("firstName");
      if (!f.lastName.trim()) miss.push("lastName");
      if (!EMAIL.test(f.email.trim())) miss.push("email");
      if (!f.subject) miss.push("subject");
      if (miss.length)
        return fail(
          "Please complete the required fields marked with an asterisk.",
          miss,
        );
      return true;
    }
    if (step === 1) {
      if (!interests.length)
        return fail("Please select at least one area of interest.");
      return true;
    }
    if (!date) return fail("Please choose a date.");
    if (!time) return fail("Please choose a time.");
    if (!altDate || !altTime)
      return fail(
        "Please choose a backup date and time in case your first choice is taken.",
      );
    return true;
  };

  const submit = useMutation({
    mutationFn: async () => {
      const dayName = days.find((d) => d.date === date)?.day ?? "";
      await api.post("/public/demo-requests", {
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        company: f.company,
        industry: f.industry,
        companySize: f.companySize,
        subject: f.subject,
        interests,
        goals: f.message,
        requestedDay: dayName,
        requestedDate: date,
        requestedTime: time,
        alternateDate: altDate,
        alternateTime: altTime,
      });
      if (newsletter) {
        // best effort: a failed newsletter signup must not fail the request
        api
          .post("/public/newsletter/subscribe", {
            email: f.email.trim(),
            source: "contact-form",
          })
          .catch(() => {});
      }
    },
    onSuccess: () => {
      setSent(true);
      rootRef.current?.querySelector(".gt-frame")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
    },
    onError: (e: any) =>
      fail(
        e?.response?.data?.message ||
          "We could not send your request. Please try again or email support@lexoraafrica.com.",
      ),
  });

  const next = () => {
    if (submit.isPending || !validate()) return;
    if (step < 2) {
      setStep(step + 1);
      setErr("");
      formRef.current?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      return;
    }
    submit.mutate();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    next();
  };

  const burst = useMemo(() => {
    const cols = ["#F7E2A6", "#E0B04A", "#B98BEF", "#C4B5FD", "#A857C9"];
    return Array.from({ length: 34 }, (_, i) => {
      const a = Math.random() * 6.283;
      const r = 90 + Math.random() * 130;
      return {
        background: cols[i % 5],
        ["--x" as string]: `${(Math.cos(a) * r).toFixed(0)}px`,
        ["--y" as string]: `${(Math.sin(a) * r).toFixed(0)}px`,
        animationDelay: `${(0.9 + Math.random() * 0.25).toFixed(2)}s`,
        boxShadow: `0 0 10px ${cols[i % 5]}`,
      } as React.CSSProperties;
    });
  }, []);

  const reset = () => {
    setSent(false);
    setStep(0);
    setDate("");
    setTime("");
    setAltDate("");
    setAltTime("");
    setInterests([]);
    setF({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      industry: "",
      companySize: "",
      subject: "",
      message: "",
    });
  };

  const tz = avail?.timezone
    ? `(${avail.timezone}, ${avail.durationMinutes ?? 30}-minute session)`
    : "";
  const whenText =
    date && time
      ? `${days.find((d) => d.date === date)?.day ?? ""} ${parts(date).d} ${parts(date).m} at ${time}`
      : "";

  const paneCls = (i: number) =>
    `gt-pane${step === i ? " on" : ""}${step > i ? " out" : ""}`;
  const stCls = (i: number) =>
    `gt-st${step === i ? " on" : ""}${step > i ? " done" : ""}`;
  const gx = (k: string) => `gx${bad[k] ? " bad" : ""}`;
  const noSlots = !loadingSlots && days.length === 0;

  return (
    <div ref={rootRef} id="getintouch" className="view on sector gt-view">
      <section className="gt-hero">
        <div className="aurora" aria-hidden="true">
          <div className="kaleido" />
          <div className="kaleido k2" />
          <div className="grid-bg" />
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="blob b3" />
        </div>
        <canvas className="stars" id="gtStars" aria-hidden="true" />
        <div className="gt-orb gt-o1" aria-hidden="true" />
        <div className="gt-orb gt-o2" aria-hidden="true" />
        <div className="wrap gt-grid">
          <div className="gt-left">
            <span className="pill rv">Get in touch</span>
            <h1 className="gt-h rv" style={{ ["--d" as string]: ".1s" }}>
              Let us build your{" "}
              <span className="shine">governance infrastructure</span> together.
            </h1>
            <p className="gt-sub rv" style={{ ["--d" as string]: ".2s" }}>
              Whether you are exploring the platform, need advisory support or
              want a personalised walkthrough, tell us where you are and our
              team will chart the way forward with you.
            </p>
            <div className="gt-cards">
              <a
                className="gt-card rv"
                style={{ ["--d" as string]: ".3s" }}
                href="mailto:support@lexoraafrica.com"
              >
                <span className="gt-ic">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <span>
                  <b>Email our team</b>
                  <i>support@lexoraafrica.com</i>
                </span>
                <span className="arr">&#8594;</span>
              </a>
              <Link
                className="gt-card rv"
                style={{ ["--d" as string]: ".38s" }}
                to="/contact?topic=demo"
              >
                <span className="gt-ic">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="13" rx="2" />
                    <path d="M8 21h8M12 17v4M10 8.5l4 2.5-4 2.5z" />
                  </svg>
                </span>
                <span>
                  <b>Book a walkthrough</b>
                  <i>A personalised demonstration of the Lexora platform</i>
                </span>
                <span className="arr">&#8594;</span>
              </Link>
              <Link
                className="gt-card rv"
                style={{ ["--d" as string]: ".46s" }}
                to="/contact?topic=advisory"
              >
                <span className="gt-ic">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8" />
                  </svg>
                </span>
                <span>
                  <b>Speak to an advisor</b>
                  <i>Governance, risk, structuring and transaction support</i>
                </span>
                <span className="arr">&#8594;</span>
              </Link>
            </div>
            <div className="gt-reach rv" style={{ ["--d" as string]: ".55s" }}>
              <span className="gt-pulse" />
              Advising organisations across multiple African jurisdictions
            </div>
          </div>

          <div className="gt-right rv-z" style={{ ["--d" as string]: ".25s" }}>
            <div className={`gt-frame${sent ? " sent" : ""}`}>
              <form
                ref={formRef}
                className={`gt-form gt2${shake ? " shake" : ""}`}
                id="gtForm"
                noValidate
                onSubmit={onSubmit}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.target as HTMLElement).tagName === "INPUT"
                  ) {
                    e.preventDefault();
                    next();
                  }
                }}
              >
                <div className="gt-steps" aria-hidden="true">
                  <div className={stCls(0)}>
                    <b>1</b>
                    <span>Your details</span>
                  </div>
                  <i className={`gt-ln${step > 0 ? " done" : ""}`}>
                    <u />
                  </i>
                  <div className={stCls(1)}>
                    <b>2</b>
                    <span>Your interests</span>
                  </div>
                  <i className={`gt-ln${step > 1 ? " done" : ""}`}>
                    <u />
                  </i>
                  <div className={stCls(2)}>
                    <b>3</b>
                    <span>Select a time</span>
                  </div>
                </div>

                <div className="gt-panes">
                  <fieldset className={paneCls(0)}>
                    <legend className="sr">Your details</legend>
                    <div className="g2c">
                      <label className={gx("firstName")}>
                        <span className="gl">
                          First name <em>*</em>
                        </span>
                        <input
                          name="firstName"
                          autoComplete="given-name"
                          value={f.firstName}
                          onChange={(e) => set("firstName", e.target.value)}
                        />
                      </label>
                      <label className={gx("lastName")}>
                        <span className="gl">
                          Last name <em>*</em>
                        </span>
                        <input
                          name="lastName"
                          autoComplete="family-name"
                          value={f.lastName}
                          onChange={(e) => set("lastName", e.target.value)}
                        />
                      </label>
                    </div>
                    <label className={gx("email")}>
                      <span className="gl">
                        Work email <em>*</em>
                      </span>
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={f.email}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </label>
                    <label className="gx">
                      <span className="gl">Company</span>
                      <input
                        name="company"
                        autoComplete="organization"
                        value={f.company}
                        onChange={(e) => set("company", e.target.value)}
                      />
                    </label>
                    <div className="g2c">
                      <label className="gx gsel">
                        <span className="gl">Industry</span>
                        <select
                          name="industry"
                          className={f.industry ? "" : "ph"}
                          value={f.industry}
                          onChange={(e) => set("industry", e.target.value)}
                        >
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                      <label className="gx gsel">
                        <span className="gl">Company size</span>
                        <select
                          name="companySize"
                          className={f.companySize ? "" : "ph"}
                          value={f.companySize}
                          onChange={(e) => set("companySize", e.target.value)}
                        >
                          <option value="">Select size</option>
                          {SIZES.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className={`${gx("subject")} gsel`}>
                      <span className="gl">
                        Subject <em>*</em>
                      </span>
                      <select
                        name="subject"
                        className={f.subject ? "" : "ph"}
                        value={f.subject}
                        onChange={(e) => set("subject", e.target.value)}
                      >
                        <option value="">Select subject</option>
                        {SUBJECTS.map((o) => (
                          <option key={o.k}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                  </fieldset>

                  <fieldset className={paneCls(1)}>
                    <legend className="sr">Your interests</legend>
                    <span className="gl">Which areas interest you?</span>
                    <div className="gi-grid">
                      {INTERESTS.map((i) => (
                        <label className="gi" key={i}>
                          <input
                            type="checkbox"
                            checked={interests.includes(i)}
                            onChange={() => {
                              setInterests((cur) =>
                                cur.includes(i)
                                  ? cur.filter((x) => x !== i)
                                  : [...cur, i],
                              );
                              setErr("");
                            }}
                          />
                          <span>{i}</span>
                        </label>
                      ))}
                    </div>
                    <label className="gx">
                      <span className="gl">Anything else we should know?</span>
                      <textarea
                        name="message"
                        rows={4}
                        value={f.message}
                        onChange={(e) => set("message", e.target.value)}
                      />
                    </label>
                    <label className="gt-chk">
                      <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                      />
                      <i />
                      Subscribe me to the Boardroom Bytes Newsletter
                    </label>
                  </fieldset>

                  <fieldset className={paneCls(2)}>
                    <legend className="sr">Select a time</legend>
                    {loadingSlots ? (
                      <span className="gl">Loading available times...</span>
                    ) : noSlots ? (
                      <p className="gt-hint">
                        There are no open times at the moment. Please email{" "}
                        <a href="mailto:support@lexoraafrica.com">
                          support@lexoraafrica.com
                        </a>{" "}
                        and we will arrange a slot with you.
                      </p>
                    ) : (
                      <>
                        <span className="gl">
                          Choose a date <em>*</em>
                        </span>
                        <DayPicker
                          days={days}
                          name="date"
                          value={date}
                          onPick={(d) => {
                            setDate(d);
                            setTime("");
                            setErr("");
                          }}
                        />
                        {date && (
                          <>
                            <span className="gl">
                              Choose a time <em>*</em> <small>{tz}</small>
                            </span>
                            <TimePicker
                              slots={slotsFor(date)}
                              name="time"
                              value={time}
                              onPick={(t) => {
                                setTime(t);
                                setErr("");
                              }}
                            />
                          </>
                        )}
                        {date && time && (
                          <>
                            <span className="gl">
                              Backup date <em>*</em>
                            </span>
                            <DayPicker
                              days={days}
                              name="altDate"
                              value={altDate}
                              onPick={(d) => {
                                setAltDate(d);
                                setAltTime("");
                                setErr("");
                              }}
                            />
                            {altDate && (
                              <>
                                <span className="gl">
                                  Backup time <em>*</em>
                                </span>
                                <TimePicker
                                  slots={slotsFor(altDate)}
                                  name="altTime"
                                  value={altTime}
                                  disabledTime={
                                    altDate === date ? time : undefined
                                  }
                                  onPick={(t) => {
                                    setAltTime(t);
                                    setErr("");
                                  }}
                                />
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </fieldset>
                </div>

                <button
                  type="button"
                  className={`btn gt-next${submit.isPending ? " busy" : ""}`}
                  onClick={next}
                  disabled={step === 2 && noSlots}
                >
                  {submit.isPending ? "Sending" : LBL[step]}
                </button>
                <div className="gt-foot">
                  <button
                    type="button"
                    className="gt-back"
                    style={{ visibility: step > 0 ? "visible" : "hidden" }}
                    onClick={() => {
                      setErr("");
                      setStep(Math.max(0, step - 1));
                    }}
                  >
                    &#8592; Back
                  </button>
                  <span className="gt-sec">
                    <svg viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 018 0v3" />
                    </svg>
                    Your details are secure and will not be shared.
                  </span>
                </div>
                <div className="gt-err" role="alert">
                  {err}
                </div>
              </form>

              <div className="gt-done" role="status" aria-live="polite">
                <div className="gt-burst" aria-hidden="true">
                  {sent &&
                    !reduced &&
                    burst.map((s, i) => <i key={i} style={s} />)}
                </div>
                <svg
                  className="gt-check"
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="gtg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#F7E2A6" />
                      <stop offset=".5" stopColor="#E0B04A" />
                      <stop offset="1" stopColor="#A857C9" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#gtg)"
                    strokeWidth="4"
                  />
                  <path
                    d="M38 62l15 15 30-34"
                    fill="none"
                    stroke="url(#gtg)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h2>Thank you{f.firstName ? `, ${f.firstName}` : ""}.</h2>
                <p className="gt-when">
                  Requested session: <b>{whenText}</b>
                </p>
                <p>Our team will confirm the session by email.</p>
                <div className="gt-dact">
                  <Link className="btn btn-gold magnet" to="/">
                    Return home <span className="arr">&#8594;</span>
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost2"
                    onClick={reset}
                  >
                    Send another request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
