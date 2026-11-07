// Content for the profile artwork. Mirrors src/data/profile.ts in the portfolio repo.
// Edit here, then run `npm run build` to regenerate ./assets.

export const SITE = "https://portfolio-umber-chi-59.vercel.app";

export const DATA = {
  name: "Dhruv Agrawal",
  role: "AI/ML Engineer",
  pitch: "I build deep-learning systems that leave the notebook and work in the real world.",
  summary:
    "AI & ML undergraduate at Ramaiah Institute of Technology. I've done applied deep-learning research at Samsung R&D and DRDO, published in IEEE, and shipped production apps used across mobile and web. I like problems where models meet hardware, data pipelines and real users.",
  email: "dhruv.agrawal2022@gmail.com",
  contactLine: "Looking for ML and software engineering roles, research collaborations, and hard problems. The inbox is open, and so is the terminal.",
  tape: ["Deep Learning", "Computer Vision", "Samsung R&D", "IEEE Published", "DRDO", "PyTorch", "Edge AI", "Full-stack"],
  education: { school: "MS Ramaiah Institute of Technology", degree: "B.E. Artificial Intelligence and Machine Learning · 2023 – 2027" },
  experience: [
    {
      company: "Samsung R&D Institute India",
      role: "Research Intern · PRISM",
      period: "Jan – Jul 2026",
      location: "Bengaluru (Remote)",
      points: [
        "Applied deep-learning research on computational imaging for mobile deployment.",
        "Custom attention network, iterated over 15+ architecture variants.",
        "Synthetic-to-real data pipeline that narrowed the sim-to-real gap.",
      ],
      tags: ["Deep learning", "Vision", "PyTorch"],
    },
    {
      company: "KRSP",
      role: "Software Development Intern",
      period: "Feb – Jun 2026",
      location: "Australia (Remote)",
      points: [
        "Cross-platform rental marketplace in Flutter and Firebase.",
        "Role-based tenant and landlord flows with offline sync.",
        "React web client with maps and Stripe; ~40% faster loads.",
      ],
      tags: ["Flutter", "Firebase", "React"],
    },
    {
      company: "DRDO – DMSRDE",
      role: "Research Intern",
      period: "Aug – Sep 2024",
      location: "Kanpur (On-site)",
      points: [
        "Camouflage Pattern Synthesis System using CNNs, CTNs and K-means.",
        "Adaptive designs across 4+ terrain types.",
        "Cut manual pattern iteration time by ~60%.",
      ],
      tags: ["CNNs", "Generative", "K-means"],
    },
  ],
  projects: [
    {
      slug: "omnisense",
      name: "OmniSense",
      tagline: "Privacy-preserving fall detection from ambient WiFi signals, with no cameras or wearables.",
      points: [
        "Falls detected from WiFi CSI captured by dual ESP32-S3 nodes.",
        "Hybrid CNN-BiGRU with a 'Non-Fall' class that suppresses false alarms.",
        "3-phase transfer-learning curriculum bridging lab and low-cost sensors.",
        "Edge-to-cloud alerts: MQTT-TLS, AWS IoT Core, SageMaker and Lambda.",
      ],
      stack: ["Python", "PyTorch", "ESP32", "AWS IoT", "SageMaker", "Lambda"],
      highlights: [
        { value: "93%", label: "accuracy" },
        { value: "97%", label: "fall precision" },
        { value: "<0.5s", label: "alert latency" },
      ],
      chips: ["Case study", "Live demo"],
      links: { caseStudy: "/projects/omnisense", demo: "/lab" },
    },
    {
      slug: "nagrik-seva-setu",
      name: "Nagrik Seva Setu",
      tagline: "AI-assisted civic grievance platform built for Smart India Hackathon 2025.",
      points: [
        "Node.js + MongoDB API syncing geotagged, voice-note complaints.",
        "LLaMA-3.1 (Groq) urgency triage; Whisper voice transcription.",
        "Analytics dashboard, geo-upvoting to merge duplicates, FCM updates.",
      ],
      stack: ["Flutter", "Firebase", "LLaMA-3.1", "Whisper", "Node.js", "MongoDB"],
      highlights: [
        { value: "LLM", label: "urgency triage" },
        { value: "Voice", label: "complaints via Whisper" },
        { value: "Live", label: "FCM updates" },
      ],
      chips: ["Case study", "GitHub"],
      links: { caseStudy: "/projects/nagrik-seva-setu", repo: "https://github.com/dhruvag14/nagarik-seva-setu" },
    },
  ],
  paper: {
    title: "Self-Learning Hybrid Load Balancing: A Numerical Thrift Approach for Virtualized HPC",
    venue: "IEEE CONECCT 2026",
    year: 2026,
    doi: "10.1109/CONECCT68978.2026.11700734",
    url: "https://ieeexplore.ieee.org/document/11700734",
    authors: ["Bhavya M", "Dhruv Agrawal", "Chitranshu Ajmera", "Ayush Jain", "Nishit Das"],
    tldr: "Treat numerical precision as a load-balancing knob: when moving data costs more than computing it, compute less precisely instead of migrating.",
    results: [
      { value: "1.215×", label: "peak speedup, 8 ranks" },
      { value: "4–16", label: "MPI ranks, WSL2" },
      { value: "<0.125", label: "Navier–Stokes residual" },
    ],
  },
  skills: [
    "PyTorch", "Computer Vision", "Deep Learning", "CNNs", "GANs", "Transfer Learning", "LLM APIs", "Python", "C++", "TypeScript", "AWS",
    "SageMaker", "IoT Core", "Lambda", "Firebase", "MongoDB", "SQL", "React", "Next.js", "Flutter", "Tailwind", "MPI", "Git",
  ],
  achievements: [
    { title: "IEEE Publication", detail: "Co-author, IEEE CONECCT 2026" },
    { title: "NSTSE 2020", detail: "National Rank 2" },
    { title: "NSTSE 2021", detail: "International Rank 11" },
    { title: "COMEDK", detail: "All India Rank 2155" },
    { title: "51st NMTC", detail: "Top 10%" },
    { title: "AWS Cloud Club, RIT", detail: "Technical Member" },
    { title: "Smart India Hackathon", detail: "Built Nagrik Seva Setu" },
  ],
};
