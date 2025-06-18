import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Leer usuarios desde CSV
const users = new SharedArray('usuarios', function () {
  const data = open('./usuarios_prueba.csv')
    .split('\n')
    .slice(1) // omitimos encabezado
    .map(line => {
      const [email, password] = line.trim().split(';');
      return { email, password };
    })
    .filter(u => u.email && u.password);
  return data;
});

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<800'],
    'http_req_failed': ['rate<0.05'],
    'checks': ['rate>0.95'],
  },
};

export default function () {
  const user = users[__VU % users.length];

  const baseUrl = 'https://ery-app-turso.vercel.app';

  const csrfRes = http.get(`${baseUrl}/api/auth/csrf`);
  let csrfToken;
  if (csrfRes.status === 200 && csrfRes.json('csrfToken')) {
    csrfToken = csrfRes.json('csrfToken');
  }

  check(csrfRes, {
    'CSRF token obtained': (r) => r.status === 200 && csrfToken !== undefined,
  });

  sleep(1);

  const loginRes = http.post(
    `${baseUrl}/api/auth/callback/credentials`,
    JSON.stringify({
      email: user.email,
      password: user.password,
      csrfToken: csrfToken,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  check(loginRes, {
    'Login successful (200)': (r) => r.status === 200,
  });

  if (loginRes.status === 200 && !(loginRes.url || '').includes('error')) {
    sleep(Math.random() * 2 + 1);

    const dashboardRes = http.get(`${baseUrl}/api/dashboard`);
    check(dashboardRes, {
      'Dashboard API is accessible': (r) => r.status === 200,
      'Dashboard contains stats': (r) => r.body.includes('habits_con_estadisticas'),
    });

    sleep(Math.random() * 3 + 2);

    const habitsRes = http.get(`${baseUrl}/api/habits`);
    check(habitsRes, {
      'Habits API is accessible': (r) => r.status === 200,
    });
  } else {
    console.error(`Login failed for ${user.email}`);
  }

  sleep(5);
}
