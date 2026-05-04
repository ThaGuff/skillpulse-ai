const BASE = '';

async function apiFetch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server returned an unexpected response. Please try again.');
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export async function analyzeSkillGaps(answers) {
  const data = await apiFetch('/api/analyze', answers);
  return data.analysis;
}

export async function generateLesson(skill, role, level) {
  const data = await apiFetch('/api/lesson', { skill, role, level });
  return data.lesson;
}

export async function createCheckoutSession(email) {
  const data = await apiFetch('/api/stripe/checkout', { email });
  return data.url;
}
