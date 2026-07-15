import { BookOpen, Books, Brain, Briefcase, CalendarCheck, ChartBar, ChartLine, Code, Compass, Flame, Gear, GraduationCap, House, Medal, MedalMilitary, Notebook, Path, Robot, Rocket, ShieldCheck, Sparkle, Target, Trophy, Users } from "@phosphor-icons/react/dist/ssr";

export const platformNav = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "AI Mentor", href: "/mentor", icon: Robot },
  { label: "Notes", href: "/notes", icon: Notebook },
  { label: "Library", href: "/library", icon: Books },
  { label: "Tests", href: "/tests", icon: ChartBar },
  { label: "Roadmaps", href: "/roadmaps", icon: Path },
  { label: "Community", href: "/community", icon: Users },
  { label: "Profile", href: "/profile", icon: Medal },
  { label: "Settings", href: "/settings", icon: Gear },
];

export const bottomNav = platformNav.slice(0, 5);

export const student = {
  name: "Aarav Mehta",
  role: "Computer Science student",
  avatar: "AM",
  level: 18,
  xp: 12480,
  nextLevelXp: 15000,
  streak: 23,
  goalCompletion: 68,
};

export const dashboardStats = [
  {
    label: "Today learned",
    value: "2h 45m",
    change: "+35m",
    icon: CalendarCheck,
    tone: "orange" as const,
  },
  {
    label: "Learning streak",
    value: "23 days",
    change: "Top 9%",
    icon: Flame,
    tone: "rose" as const,
  },
  {
    label: "Goal completion",
    value: "68%",
    change: "+8% this week",
    icon: Target,
    tone: "green" as const,
  },
  {
    label: "XP earned",
    value: "12,480",
    change: "+920",
    icon: Trophy,
    tone: "blue" as const,
  },
];

export const goals = [
  {
    slug: "placement-goal",
    title: "Placement Goal",
    description: "Crack product company interviews with DSA, CS fundamentals, projects, and mock interviews.",
    progress: 72,
    deadline: "Oct 2026",
    daysLeft: 126,
    icon: Briefcase,
    accent: "orange",
    milestones: [
      "Finish 250 curated DSA problems",
      "Revise OS, DBMS, CN, OOP",
      "Ship two portfolio projects",
      "Complete 8 mock interviews",
    ],
    remainingTasks: [
      "Dynamic programming pattern revision",
      "System design notes: caching and queues",
      "Resume project impact rewrite",
    ],
    aiSuggestions: [
      "Shift 30 minutes from theory to timed DSA for the next 5 days.",
      "Book one mock interview after finishing graph traversal problems.",
      "Create short revision cards for DBMS indexes and transactions.",
    ],
  },
  {
    slug: "gate-goal",
    title: "GATE Goal",
    description: "Structured preparation across core CS, engineering mathematics, aptitude, and full-length tests.",
    progress: 54,
    deadline: "Feb 2027",
    daysLeft: 238,
    icon: MedalMilitary,
    accent: "blue",
    milestones: [
      "Complete engineering mathematics",
      "Cover TOC and compiler design",
      "Attempt 18 subject tests",
      "Score 65+ in five full mocks",
    ],
    remainingTasks: [
      "Pipelining numericals",
      "CN congestion control",
      "Discrete math recurrence practice",
    ],
    aiSuggestions: [
      "Your math accuracy is high. Increase speed with 15-minute drills.",
      "Schedule computer networks revision before the next mock.",
      "Re-attempt incorrect questions within 48 hours.",
    ],
  },
  {
    slug: "semester-goal",
    title: "Semester Goal",
    description: "Stay ahead of lectures, assignments, lab work, internals, and exam revision.",
    progress: 81,
    deadline: "Aug 2026",
    daysLeft: 55,
    icon: BookOpen,
    accent: "green",
    milestones: [
      "Submit operating systems lab",
      "Prepare DBMS unit tests",
      "Complete ML assignment",
      "Revise all unit summaries",
    ],
    remainingTasks: ["OS deadlock report", "DBMS normalization worksheet", "ML model evaluation notes"],
    aiSuggestions: [
      "Convert DBMS weak topics into a one-page checklist.",
      "Use tonight's session for OS lab output screenshots.",
      "You can finish unit summaries in two focused blocks.",
    ],
  },
  {
    slug: "dsa-goal",
    title: "DSA Goal",
    description: "Build interview-grade problem solving across arrays, graphs, DP, tries, and greedy patterns.",
    progress: 63,
    deadline: "Sep 2026",
    daysLeft: 96,
    icon: Code,
    accent: "slate",
    milestones: ["Arrays and strings", "Trees and graphs", "Dynamic programming", "Timed contests"],
    remainingTasks: ["Trie implementation", "DP on subsequences", "Weekly contest review"],
    aiSuggestions: [
      "You are solving accurately but slowly. Add timed medium problems.",
      "Revise recursion trees before DP tabulation.",
      "Pair graph BFS questions with shortest path variants.",
    ],
  },
  {
    slug: "ai-ml-goal",
    title: "AI/ML Goal",
    description: "Learn practical machine learning, neural networks, MLOps basics, and portfolio projects.",
    progress: 46,
    deadline: "Dec 2026",
    daysLeft: 178,
    icon: Brain,
    accent: "violet",
    milestones: ["Linear models", "Deep learning basics", "NLP project", "Model deployment"],
    remainingTasks: ["Regularization notebook", "CNN visual notes", "Model monitoring primer"],
    aiSuggestions: [
      "Start with bias-variance visual examples before regularization math.",
      "Convert your notebook into a small project README.",
      "Use spaced repetition for activation functions and loss functions.",
    ],
  },
  {
    slug: "custom-goal",
    title: "Custom Goal",
    description: "Design a personal learning plan with milestones, time blocks, and accountability loops.",
    progress: 35,
    deadline: "Flexible",
    daysLeft: 0,
    icon: Compass,
    accent: "amber",
    milestones: ["Define outcome", "Choose resources", "Set weekly cadence", "Review progress"],
    remainingTasks: ["Pick benchmark project", "Create recurring study block", "Add review rubric"],
    aiSuggestions: [
      "Make the outcome measurable before adding more resources.",
      "Use two weekly checkpoints instead of one large review.",
      "Attach one proof-of-work artifact to each milestone.",
    ],
  },
];

export const tasks = [
  { title: "Solve 3 graph traversal problems", time: "6:00 PM", tag: "DSA", xp: 120 },
  { title: "Revise DBMS transactions", time: "8:00 PM", tag: "GATE", xp: 80 },
  { title: "Read CNN visual notes", time: "9:30 PM", tag: "AI/ML", xp: 70 },
];

export const notes = [
  {
    slug: "dbms-transactions",
    title: "DBMS Transactions and ACID",
    category: "DBMS",
    readTime: "14 min",
    progress: 62,
    highlights: 8,
    summary:
      "Atomicity, consistency, isolation, durability, schedules, conflict serializability, and recovery ideas.",
  },
  {
    slug: "dynamic-programming-patterns",
    title: "Dynamic Programming Patterns",
    category: "DSA",
    readTime: "22 min",
    progress: 48,
    highlights: 13,
    summary:
      "State definition, transitions, memoization, tabulation, subsequences, grids, and knapsack variations.",
  },
  {
    slug: "operating-system-deadlocks",
    title: "Operating System Deadlocks",
    category: "Operating Systems",
    readTime: "11 min",
    progress: 86,
    highlights: 5,
    summary:
      "Necessary conditions, resource allocation graphs, prevention, avoidance, and Banker's algorithm.",
  },
  {
    slug: "ml-regularization",
    title: "Regularization in Machine Learning",
    category: "AI/ML",
    readTime: "18 min",
    progress: 33,
    highlights: 9,
    summary:
      "Bias-variance tradeoff, L1/L2 penalties, dropout, early stopping, and model generalization checks.",
  },
];

export const books = [
  {
    slug: "clean-code-notes",
    title: "Clean Code Notes for Students",
    author: "Robert C. Martin inspired guide",
    category: "Software Engineering",
    progress: 58,
    pages: 214,
    saved: true,
  },
  {
    slug: "gate-cs-formula-book",
    title: "GATE CS Formula Book",
    author: "GaugeHow Faculty",
    category: "Competitive Exam",
    progress: 74,
    pages: 168,
    saved: true,
  },
  {
    slug: "math-for-machine-learning",
    title: "Math for Machine Learning",
    author: "Study Companion",
    category: "AI/ML",
    progress: 29,
    pages: 302,
    saved: false,
  },
  {
    slug: "system-design-visual-primer",
    title: "System Design Visual Primer",
    author: "GaugeHow Labs",
    category: "Placement",
    progress: 18,
    pages: 246,
    saved: false,
  },
];

export const tests = [
  {
    title: "DSA Mixed Patterns Mock",
    status: "Active",
    questions: 45,
    duration: "90 min",
    accuracy: 78,
    score: "132/180",
  },
  {
    title: "GATE OS Subject Test",
    status: "Scheduled",
    questions: 35,
    duration: "75 min",
    accuracy: 0,
    score: "-",
  },
  {
    title: "DBMS Transaction Quiz",
    status: "Completed",
    questions: 20,
    duration: "25 min",
    accuracy: 84,
    score: "42/50",
  },
];

export const performanceTrend = [
  { label: "Mon", value: 62 },
  { label: "Tue", value: 68 },
  { label: "Wed", value: 64 },
  { label: "Thu", value: 72 },
  { label: "Fri", value: 78 },
  { label: "Sat", value: 82 },
  { label: "Sun", value: 79 },
];

export const roadmaps = [
  {
    title: "Web Development",
    icon: Code,
    progress: 64,
    steps: ["HTML/CSS", "JavaScript", "React", "Next.js", "APIs", "Deployment"],
  },
  {
    title: "DSA",
    icon: Path,
    progress: 58,
    steps: ["Arrays", "Hashing", "Trees", "Graphs", "DP", "Contests"],
  },
  {
    title: "AI/ML",
    icon: Brain,
    progress: 41,
    steps: ["Python", "Math", "ML", "Deep Learning", "NLP", "MLOps"],
  },
  {
    title: "Data Science",
    icon: ChartLine,
    progress: 36,
    steps: ["Stats", "SQL", "Pandas", "Visualization", "ML", "Storytelling"],
  },
  {
    title: "DevOps",
    icon: Rocket,
    progress: 22,
    steps: ["Linux", "Git", "Docker", "CI/CD", "Cloud", "Monitoring"],
  },
  {
    title: "Cybersecurity",
    icon: ShieldCheck,
    progress: 18,
    steps: ["Networking", "Linux", "Web Security", "Crypto", "Labs", "Blue Team"],
  },
];

export const communityPosts = [
  {
    author: "Ananya",
    badge: "GATE Rank Sprint",
    text: "Finally crossed 70% in operating systems subject tests after revising deadlock questions daily.",
    replies: 18,
    xp: 240,
  },
  {
    author: "Rohan",
    badge: "DSA Doubt",
    text: "Can someone explain why monotonic queues work better than heaps for fixed window maximum?",
    replies: 11,
    xp: 90,
  },
  {
    author: "Meera",
    badge: "Achievement",
    text: "Completed the full stack roadmap capstone and shipped a live project with authentication mocked.",
    replies: 27,
    xp: 420,
  },
];

export const achievements = [
  { title: "23-day streak", icon: Flame, detail: "Consistency builder" },
  { title: "DSA Finisher", icon: Trophy, detail: "150 problems solved" },
  { title: "Note Scholar", icon: Notebook, detail: "42 highlights saved" },
  { title: "AI Planner", icon: Sparkle, detail: "12 study plans generated" },
];

export const mentorPrompts = [
  "Explain dynamic programming with a simple analogy",
  "Create a 7-day GATE OS revision plan",
  "Summarize this chapter into exam notes",
  "Recommend the next course for placement prep",
];

export const sampleJourney = [
  "Aarav opens Dashboard and checks today's focused plan.",
  "He continues the DSA Interview Sprint video lesson.",
  "He asks AI Mentor to explain a sliding window edge case.",
  "He saves notes, completes a quiz, and updates the Placement Goal.",
];
