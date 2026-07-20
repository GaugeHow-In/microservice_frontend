/**
 * Rotating copy for the dashboard hero. A greeting is prefixed to the learner's
 * name ("{greeting}, {firstName}.") and a subtitle sits below it. Both are picked
 * at random on each visit so the dashboard feels alive rather than static.
 *
 * Keep greetings address-style so they always read grammatically before a name.
 */
export const dashboardGreetings = [
  "Welcome back",
  "Good to see you",
  "Great to have you back",
  "Ready when you are",
  "Back at it",
  "Let's get to work",
  "Good to have you",
  "Let's dive in",
  "Welcome aboard",
  "Nice to see you",
  "Let's make it count",
  "Back in the workshop",
] as const;

export const dashboardSubtitles = [
  "Ready to continue your engineering journey today?",
  "Every great machine started with a single sketch.",
  "Precision is a habit — let's build it one lesson at a time.",
  "Torque, thermodynamics, or a tricky free-body diagram? Let's tackle it.",
  "From first principles to finished designs — you've got this.",
  "Small gains compound. Let's turn today's crank.",
  "The best engineers never stop being students.",
  "Free-body diagrams don't draw themselves. Let's begin.",
  "Stress today, strength tomorrow. Keep loading.",
  "Let's convert curiosity into competence.",
  "Your next breakthrough is one concept away.",
  "Design, analyze, iterate — that's the engineer's loop.",
  "Master the fundamentals and the rest follows.",
  "Ready to make some mechanical progress?",
  "Every formula you learn is a tool for life.",
  "Great engineers are made one problem set at a time.",
  "Let's tighten up those core concepts today.",
  "What will you engineer today?",
  "Momentum is easier to keep than to start — let's move.",
  "Turn confusion into clarity, one lesson at a time.",
  "The gears are turning. Let's keep them going.",
  "Solid foundations build tall structures. Start here.",
  "Learn it once, apply it forever.",
  "From GD&T to gearboxes — your toolkit is growing.",
  "Sharpen your instincts, one derivation at a time.",
  "Consistency beats intensity. Show up and learn.",
  "Today's practice is tomorrow's expertise.",
  "Let's decode the machinery of the world together.",
  "A little progress each day adds up to big results.",
  "Engineering is applied curiosity — stay curious.",
  "Ready to strengthen your mechanical intuition?",
  "Bolt down the basics before you build up.",
  "The world runs on engineers who kept learning.",
  "One more lesson, one step closer to mastery.",
  "Let's transform theory into real-world skill.",
  "Your future self will thank you for today's effort.",
  "Keep calm and calculate the load.",
  "Great designs begin with great understanding.",
  "Time to put some horsepower behind your goals.",
  "Measure twice, learn once — let's get precise.",
] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomDashboardGreeting() {
  return {
    greeting: pick(dashboardGreetings),
    subtitle: pick(dashboardSubtitles),
  };
}
