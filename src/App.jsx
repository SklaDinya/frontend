import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const seedStorages = [
  {
    id: 'storage-center',
    name: 'SklaDinya Центр',
    address: 'ул. Крещатик, 22',
    description: 'Центральный пункт хранения в самом сердце города. Круглосуточный доступ.',
    status: 'Active',
    created: '29.03.2026',
  },
  {
    id: 'storage-station',
    name: 'SklaDinya Вокзал',
    address: 'пл. Вокзальная, 1',
    description: 'Удобное расположение рядом с ж/д вокзалом. Ячейки разных размеров.',
    status: 'Active',
    created: '08.04.2026',
  },
  {
    id: 'storage-airport',
    name: 'SklaDinya Аэропорт',
    address: 'Аэропорт, терминал B',
    description: 'Заявка на рассмотрении администратором.',
    status: 'Created',
    created: '26.04.2026',
  },
];

const seedCells = [
  { id: 'cell-a01', storageId: 'storage-center', name: 'A-01', cellClass: 'Маленькая', price: 25, status: 'Свободна' },
  { id: 'cell-a02', storageId: 'storage-center', name: 'A-02', cellClass: 'Маленькая', price: 25, status: 'Свободна' },
  { id: 'cell-b01', storageId: 'storage-center', name: 'B-01', cellClass: 'Средняя', price: 45, status: 'Свободна' },
  { id: 'cell-c01', storageId: 'storage-station', name: 'C-01', cellClass: 'Большая', price: 70, status: 'Свободна' },
  { id: 'cell-d02', storageId: 'storage-station', name: 'D-02', cellClass: 'Средняя', price: 45, status: 'Свободна' },
];

const seedUsers = [
  { id: 'user-ivan', login: 'ivan', name: 'Иван Петров', email: 'ivan@test.com', role: 'Клиент', blocked: false },
  { id: 'user-maria', login: 'maria', name: 'Мария Сидорова', email: 'maria@test.com', role: 'Клиент', blocked: false },
  { id: 'user-admin', login: 'admin', name: 'Администратор', email: 'admin@skladinya.com', role: 'Админ', blocked: false },
  { id: 'user-operator', login: 'operator1', name: 'Олег Операторов', email: 'oleg@skladinya.com', role: 'Оператор', blocked: false },
];

const seedBookings = [
  {
    id: 'booking-1',
    storageId: 'storage-center',
    storage: 'SklaDinya Центр',
    cells: ['A-01'],
    start: '2026-05-01T10:00',
    hours: 2,
    status: 'Paid',
    total: 50,
  },
  {
    id: 'booking-2',
    storageId: 'storage-station',
    storage: 'SklaDinya Вокзал',
    cells: ['D-02'],
    start: '2026-05-03T14:00',
    hours: 4,
    status: 'Created',
    total: 180,
  },
];

const navSections = [
  {
    title: 'Личный кабинет',
    items: [
      { key: 'profile', label: 'Мои данные' },
    ],
  },
  {
    title: 'Бронирования',
    items: [
      { key: 'activeBookings', label: 'Активные' },
      { key: 'history', label: 'История' },
    ],
  },
  {
    title: 'Пункты',
    items: [
      { key: 'createStorage', label: 'Создать пункт' },
      { key: 'operatorStorage', label: 'Пункт сотрудника' },
      { key: 'operators', label: 'Операторы' },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      { key: 'users', label: 'Пользователи' },
      { key: 'storageRequests', label: 'Заявки на пункты' },
    ],
  },
];

function money(value) {
  return `${Number(value || 0).toFixed(2).replace('.', ',')} ₽`;
}

function toHumanStatus(status) {
  const map = {
    Created: 'Создано',
    Paid: 'Подтверждено',
    InProcess: 'В процессе',
    Finished: 'Выполнено',
    Canceled: 'Отменено',
    Active: 'Активен',
  };
  return map[status] || status;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('skladinya-token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(payload));
  } catch {
    return {};
  }
}

function normalizeUser(user, claims = {}) {
  const role = user.role || claims.userRole || 'Client';
  return {
    id: user.id || claims.userId,
    login: user.username || user.login || '',
    name: user.name || '',
    email: user.email || '',
    role,
    storageId: claims.storageId,
    operatorRole: claims.operatorRole,
    blocked: Boolean(user.banned || user.blocked),
  };
}

function roleLabel(role) {
  const labels = {
    Client: 'Клиент',
    StorageOperator: 'Оператор',
    Admin: 'Админ',
  };
  return labels[role] || role;
}

function operatorRoleLabel(role) {
  const labels = {
    MainOperator: 'Старший оператор',
    OrdinaryOperator: 'Оператор',
  };
  return labels[role] || role;
}

function routeForRole(role) {
  if (role === 'StorageOperator') {
    return 'operatorStorage';
  }
  return 'profile';
}

function allowedRoutesForUser(user) {
  const routes = {
    Client: ['profile', 'activeBookings', 'history', 'createStorage'],
    StorageOperator: user?.operatorRole === 'MainOperator'
      ? ['profile', 'operatorStorage', 'operators']
      : ['profile', 'operatorStorage'],
    Admin: ['profile', 'users', 'storageRequests'],
  };
  return routes[user?.role] || ['profile'];
}

function navSectionsForUser(user) {
  const allowed = new Set(allowedRoutesForUser(user));
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.has(item.key)),
    }))
    .filter((section) => section.items.length);
}

function normalizeStorage(storage) {
  return {
    id: storage.id,
    name: storage.name,
    address: storage.address,
    description: storage.description || '',
    status: storage.status,
    created: storage.createdAt ? new Date(storage.createdAt).toLocaleDateString('ru-RU') : '',
  };
}

function parseDurationHours(value) {
  const match = String(value || '').match(/PT(\d+)H/);
  return match ? Number(match[1]) : 0;
}

function normalizeBooking(booking) {
  return {
    id: booking.id,
    storageId: booking.storageId,
    storage: booking.storage?.name || booking.storageId,
    cells: (booking.cells || []).map((cell) => cell.name),
    start: booking.startTime || '',
    hours: parseDurationHours(booking.bookingTime),
    status: booking.status,
    total: Number(booking.price || 0),
  };
}

function operatorBookingQuery() {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  return `?startBooking=${encodeURIComponent(start)}&endBooking=${encodeURIComponent(end)}&pageNumber=0&pageSize=100`;
}

function App() {
  const [route, setRoute] = useState('home');
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [storages, setStorages] = useState([]);
  const [cells, setCells] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedStorageId, setSelectedStorageId] = useState('');
  const [bookingDraft, setBookingDraft] = useState(null);
  const [notice, setNotice] = useState('Подключение к backend...');

  const selectedStorage = storages.find((storage) => storage.id === selectedStorageId) || storages[0];
  const visibleStorages = useMemo(() => {
    const value = query.trim().toLowerCase();
    return storages.filter((storage) => storage.status === 'Active')
      .filter((storage) => !value || `${storage.name} ${storage.address}`.toLowerCase().includes(value));
  }, [storages, query]);

  const cabinetRoutes = currentUser ? allowedRoutesForUser(currentUser) : [];
  const isCabinet = cabinetRoutes.includes(route);

  useEffect(() => {
    request('/actuator/health')
      .then(() => {
        setNotice('Backend API подключен.');
      })
      .catch(() => {
        setNotice('Backend недоступен. Проверьте Docker и порт 8080.');
      });

    request('/api/v1/storages')
      .then((items) => {
        const loaded = (items || []).map(normalizeStorage);
        setStorages(loaded);
        if (loaded[0]) {
          setSelectedStorageId(loaded[0].id);
        }
      })
      .catch(() => setStorages([]));

    const token = localStorage.getItem('skladinya-token');
    if (token) {
      loadCurrentUser(token).catch(() => {
        localStorage.removeItem('skladinya-token');
        setCurrentUser(null);
      });
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !allowedRoutesForUser(currentUser).includes(route)) {
      return;
    }

    if (route === 'users' && currentUser.role === 'Admin') {
      request('/api/v1/users')
        .then((items) => setUsers((items || []).map((user) => normalizeUser(user))))
        .catch(() => setNotice('Не удалось загрузить пользователей из backend.'));
    }

    if (route === 'storageRequests' && currentUser.role === 'Admin') {
      request('/api/v1/storages/requests')
        .then((items) => setStorages((items || []).map(normalizeStorage)))
        .catch(() => setNotice('Не удалось загрузить заявки на пункты.'));
    }

    if (route === 'operatorStorage' && currentUser.role === 'StorageOperator') {
      request('/api/v1/storages/my')
        .then((storage) => {
          const loaded = normalizeStorage(storage);
          setStorages((items) => [loaded, ...items.filter((item) => item.id !== loaded.id)]);
          setSelectedStorageId(loaded.id);
        })
        .catch(() => setNotice('Не удалось загрузить пункт оператора.'));
      request('/api/v1/storages/my/cells')
        .then((items) => setCells((items || []).map((cell) => ({ ...cell, price: 0, status: 'Свободна' }))))
        .catch(() => setNotice('Не удалось загрузить ячейки пункта.'));
      request(`/api/v1/storages/my/bookings${operatorBookingQuery()}`)
        .then((items) => setBookings((items || []).map(normalizeBooking)))
        .catch(() => setBookings([]));
    }

    if (route === 'operators' && currentUser.operatorRole === 'MainOperator') {
      request('/api/v1/storages/my/operators')
        .then((items) => setOperators(items || []))
        .catch(() => setNotice('Не удалось загрузить операторов пункта.'));
    }

    if ((route === 'activeBookings' || route === 'history') && currentUser.role === 'Client') {
      request('/api/v1/users/me/bookings')
        .then((items) => setBookings((items || []).map(normalizeBooking)))
        .catch(() => setNotice('Не удалось загрузить бронирования.'));
    }
  }, [currentUser, route]);

  async function loadCurrentUser(token) {
    const claims = decodeJwtPayload(token);
    const user = normalizeUser(await request('/api/v1/users/me'), claims);
    setCurrentUser(user);
    return user;
  }

  async function signIn(form) {
    try {
      const token = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.login, password: form.password }),
      });
      localStorage.setItem('skladinya-token', token);
      const user = await loadCurrentUser(token);
      setRoute(routeForRole(user.role));
      setNotice('Вход выполнен через backend.');
    } catch {
      localStorage.removeItem('skladinya-token');
      setCurrentUser(null);
      setNotice('Вход не выполнен. Проверьте логин, пароль и доступность backend.');
    }
  }

  async function register(form) {
    try {
      const token = await request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: form.login, password: form.password, name: form.name, email: form.email }),
      });
      localStorage.setItem('skladinya-token', token);
      const user = await loadCurrentUser(token);
      setRoute(routeForRole(user.role));
      setNotice('Регистрация выполнена через backend.');
    } catch {
      localStorage.removeItem('skladinya-token');
      setCurrentUser(null);
      setNotice('Регистрация не выполнена. Проверьте данные и доступность backend.');
    }
  }

  function signOut() {
    localStorage.removeItem('skladinya-token');
    setCurrentUser(null);
    setRoute('home');
    setNotice('Вы вышли из личного кабинета.');
  }

  async function startBooking(storageId) {
    if (currentUser?.role !== 'Client') {
      setNotice('Бронирование доступно только клиенту.');
      setRoute(currentUser ? routeForRole(currentUser.role) : 'login');
      return;
    }

    setSelectedStorageId(storageId);
    setBookingDraft(null);
    try {
      const loadedCells = await request(`/api/v1/storages/${storageId}/cells`);
      setCells((items) => [
        ...(loadedCells || []).map((cell) => ({ ...cell, price: 0, status: 'Свободна' })),
        ...items.filter((cell) => cell.storageId !== storageId),
      ]);
    } catch {
      setNotice('Не удалось загрузить ячейки выбранного пункта.');
    }
    setRoute('booking');
  }

  async function createBooking(payload) {
    if (!selectedStorage) {
      setNotice('Пункт не выбран.');
      return;
    }

    try {
      const receipt = await request('/api/v1/users/me/bookings', {
        method: 'POST',
        body: JSON.stringify({
          storageId: selectedStorage.id,
          cellIds: payload.cellIds,
          startTime: new Date(payload.start).toISOString(),
          bookingTime: `PT${Number(payload.hours)}H`,
        }),
      });
      const booking = { ...normalizeBooking(receipt.booking), receipt: receipt.receipt };
      setBookings((items) => [booking, ...items]);
      setBookingDraft(booking);
      setRoute('payment');
      setNotice('Бронирование создано через backend. До оплаты оно находится в статусе "Создано".');
    } catch {
      setNotice('Не удалось создать бронирование.');
    }
  }

  async function payBooking(mode) {
    if (!bookingDraft) {
      return;
    }

    try {
      const paid = await request(`/api/v1/payments/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ receipt: bookingDraft.receipt }),
      });
      const updated = normalizeBooking(paid);
      setBookings((items) => items.map((booking) => (
        booking.id === updated.id ? updated : booking
      )));
      setBookingDraft(updated);
      setNotice('Оплата прошла успешно через backend. Бронирование подтверждено.');
      setRoute('activeBookings');
    } catch {
      setNotice('Оплата не прошла. Можно попробовать еще раз.');
    }
  }

  async function cancelBooking(id) {
    try {
      await request(`/api/v1/users/me/bookings/${id}`, { method: 'DELETE' });
      setBookings((items) => items.map((booking) => (
        booking.id === id ? { ...booking, status: 'Canceled' } : booking
      )));
      setNotice('Бронирование отменено через backend.');
    } catch {
      setNotice('Не удалось отменить бронирование.');
    }
  }

  async function saveProfile(form) {
    try {
      const token = await request('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          username: form.login,
          name: form.name,
          email: form.email,
        }),
      });
      if (token) {
        localStorage.setItem('skladinya-token', token);
      }
      const updated = await loadCurrentUser(token || localStorage.getItem('skladinya-token'));
      setUsers((items) => items.map((user) => (user.id === updated.id ? updated : user)));
      setNotice('Личные данные сохранены через backend.');
    } catch {
      setNotice('Не удалось сохранить личные данные.');
    }
  }

  async function createStorage(form) {
    try {
      const storage = await request('/api/v1/storages', {
        method: 'POST',
        body: JSON.stringify({
          username: form.operatorLogin,
          password: form.operatorPassword,
          name: form.operatorName,
          email: form.operatorEmail,
          storageName: form.name,
          address: form.address,
          description: form.description,
        }),
      });
      setStorages((items) => [normalizeStorage(storage), ...items]);
      setNotice('Заявка на создание пункта отправлена в backend.');
      setRoute('profile');
    } catch {
      setNotice('Не удалось отправить заявку на создание пункта.');
    }
  }

  async function approveStorage(id) {
    try {
      const storage = await request(`/api/v1/storages/${id}/approve`, { method: 'PATCH' });
      const updated = normalizeStorage(storage);
      setStorages((items) => items.map((item) => (item.id === id ? updated : item)));
      setNotice('Пункт хранения подтвержден через backend.');
    } catch {
      setNotice('Не удалось подтвердить пункт хранения.');
    }
  }

  async function rejectStorage(id) {
    try {
      await request(`/api/v1/storages/${id}/reject`, { method: 'DELETE' });
      setStorages((items) => items.filter((storage) => storage.id !== id));
      setNotice('Заявка отклонена через backend.');
    } catch {
      setNotice('Не удалось отклонить заявку.');
    }
  }

  async function addCell(form) {
    try {
      const cell = await request('/api/v1/storages/my/cells', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, cellClass: form.cellClass }),
      });
      setCells((items) => [{ ...cell, price: 0, status: 'Свободна' }, ...items]);
      setNotice('Ячейка хранения добавлена через backend.');
    } catch {
      setNotice('Не удалось добавить ячейку хранения.');
    }
  }

  async function toggleBlockUser(id) {
    const user = users.find((item) => item.id === id);
    if (!user) {
      return;
    }

    try {
      const updated = await request(`/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ banned: !user.blocked }),
      });
      setUsers((items) => items.map((item) => (
        item.id === id ? normalizeUser(updated) : item
      )));
    } catch {
      setNotice('Не удалось изменить блокировку пользователя.');
    }
  }

  return (
    <div className="app-shell">
      <Header
        query={query}
        setQuery={setQuery}
        currentUser={currentUser}
        onNavigate={setRoute}
        onSearch={() => setRoute('home')}
        onSignOut={signOut}
      />

      {notice && (
        <button className="notice" type="button" onClick={() => setNotice('')}>
          {notice}
        </button>
      )}

      <main className={isCabinet ? 'workspace with-sidebar' : 'workspace'}>
        {isCabinet && <Sidebar route={route} currentUser={currentUser} onNavigate={setRoute} />}

        <section className="content">
          {route === 'home' && (
            <Home storages={visibleStorages} onBook={startBooking} currentUser={currentUser} />
          )}
          {route === 'login' && <AuthCard mode="login" onSubmit={signIn} onSwitch={() => setRoute('register')} />}
          {route === 'register' && <AuthCard mode="register" onSubmit={register} onSwitch={() => setRoute('login')} />}
          {route === 'booking' && (
            <BookingPage
              storage={selectedStorage}
              cells={cells.filter((cell) => cell.storageId === selectedStorage.id)}
              onBack={() => setRoute('home')}
              onCreate={createBooking}
            />
          )}
          {route === 'payment' && <PaymentPage booking={bookingDraft} onPay={payBooking} onBack={() => setRoute('booking')} />}
          {route === 'profile' && currentUser && <ProfilePage user={currentUser} onSave={saveProfile} />}
          {route === 'activeBookings' && (
            <BookingsPage
              title="Активные бронирования"
              bookings={bookings.filter((booking) => booking.status !== 'Finished' && booking.status !== 'Canceled')}
              onCancel={cancelBooking}
            />
          )}
          {route === 'history' && (
            <BookingsPage
              title="История бронирований"
              bookings={bookings.filter((booking) => booking.status === 'Finished' || booking.status === 'Canceled')}
              onCancel={cancelBooking}
            />
          )}
          {route === 'createStorage' && <CreateStoragePage onCreate={createStorage} />}
          {route === 'operatorStorage' && (
            <OperatorStoragePage
              storage={selectedStorage}
              cells={selectedStorage ? cells.filter((cell) => cell.storageId === selectedStorage.id) : []}
              bookings={selectedStorage ? bookings.filter((booking) => booking.storageId === selectedStorage.id) : []}
              onAddCell={addCell}
            />
          )}
          {route === 'operators' && <OperatorsPage operators={operators} />}
          {route === 'users' && <UsersPage users={users} onToggleBlock={toggleBlockUser} />}
          {route === 'storageRequests' && (
            <StorageRequestsPage storages={storages} onApprove={approveStorage} onReject={rejectStorage} />
          )}
        </section>
      </main>
    </div>
  );
}

function Header({ query, setQuery, currentUser, onNavigate, onSearch, onSignOut }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => onNavigate('home')} aria-label="На главную">
        <img className="brand-logo" src="/main_photo.jpg" alt="" />
        <span>SklaDinya</span>
      </button>

      <form className="search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название или адрес пункта..."
        />
        <button className="btn btn-primary" type="submit">Найти</button>
      </form>

      <div className="header-actions">
        {currentUser ? (
          <>
            <button className="btn btn-light" type="button" onClick={() => onNavigate('profile')}>Личный кабинет</button>
            <button className="btn btn-danger" type="button" onClick={onSignOut}>Выйти</button>
          </>
        ) : (
          <>
            <button className="btn btn-light" type="button" onClick={() => onNavigate('login')}>Вход</button>
            <button className="btn btn-warm" type="button" onClick={() => onNavigate('register')}>Регистрация</button>
          </>
        )}
      </div>
    </header>
  );
}

function Sidebar({ route, currentUser, onNavigate }) {
  const sections = navSectionsForUser(currentUser);

  return (
    <aside className="sidebar">
      {sections.map((section) => (
        <div className="nav-section" key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <button
              className={route === item.key ? 'nav-item active' : 'nav-item'}
              type="button"
              key={item.key}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function Home({ storages, onBook, currentUser }) {
  return (
    <div className="home">
      <section className="intro-band">
        <h1>Добро пожаловать в SklaDinya!</h1>
        <p>Сервис бронирования ячеек хранения. Найдите удобный пункт и забронируйте ячейку.</p>
        <div className="metrics">
          <span>{storages.length} пункта найдено</span>
          <span>Шаг бронирования 1 час</span>
          <span>{currentUser ? 'Вы авторизованы' : 'Доступен вход или регистрация'}</span>
        </div>
      </section>

      <div className="list-header">Найдено пунктов: {storages.length}</div>
      <div className="storage-list">
        {storages.map((storage) => (
          <article className="storage-card" key={storage.id}>
            <div>
              <h2>{storage.name}</h2>
              <p className="strong">Адрес: {storage.address}</p>
              <p>{storage.description}</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => onBook(storage.id)}>Забронировать</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function AuthCard({ mode, onSubmit, onSwitch }) {
  const [form, setForm] = useState({ login: 'OperatorUser1', password: 'OperatorUser1', name: 'Новый клиент', email: 'client@test.com' });
  const isRegister = mode === 'register';

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <h1>{isRegister ? 'Регистрация' : 'Вход в систему'}</h1>
        <input value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} placeholder="Логин" />
        {isRegister && (
          <>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Имя" />
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Почта" />
          </>
        )}
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Пароль" />
        <button className="btn btn-blue block" type="submit">{isRegister ? 'Зарегистрироваться' : 'Войти'}</button>
        <button className="link-button" type="button" onClick={onSwitch}>
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Еще нет аккаунта? Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

function BookingPage({ storage, cells, onBack, onCreate }) {
  const [start, setStart] = useState('2026-05-01T10:00');
  const [hours, setHours] = useState(2);
  const [cellClass, setCellClass] = useState('Все классы');
  const [selected, setSelected] = useState([]);

  if (!storage) {
    return <EmptyState title="Пункт не выбран" action="Назад" onAction={onBack} />;
  }

  const classes = ['Все классы', ...Array.from(new Set(cells.map((cell) => cell.cellClass)))];
  const filteredCells = cells.filter((cell) => cellClass === 'Все классы' || cell.cellClass === cellClass);

  function toggle(id) {
    setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  return (
    <div>
      <button className="btn btn-muted" type="button" onClick={onBack}>Назад</button>
      <h1>Бронирование — {storage.name}</h1>

      <form className="booking-tools" onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) {
          onCreate({ start, hours, cellIds: selected });
        }
      }}>
        <label>
          Дата и время начала:
          <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label>
          Длительность (часов):
          <input type="number" min="1" max="168" value={hours} onChange={(event) => setHours(event.target.value)} />
        </label>
        <label>
          Класс ячейки:
          <select value={cellClass} onChange={(event) => setCellClass(event.target.value)}>
            {classes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button className="btn btn-blue" type="button">Фильтровать</button>

        <DataTable
          columns={['Выбор', 'Название', 'Класс', 'Цена (₽/ч)']}
          rows={filteredCells.map((cell) => [
            <input type="checkbox" checked={selected.includes(cell.id)} onChange={() => toggle(cell.id)} aria-label={`Выбрать ${cell.name}`} />,
            cell.name,
            cell.cellClass,
            money(cell.price),
          ])}
        />

        <div className="footer-actions">
          <button className="btn btn-primary" type="submit" disabled={!selected.length}>Оплатить</button>
        </div>
      </form>
    </div>
  );
}

function PaymentPage({ booking, onPay, onBack }) {
  if (!booking) {
    return (
      <EmptyState title="Нет выбранного бронирования" action="Вернуться" onAction={onBack} />
    );
  }

  return (
    <div>
      <button className="btn btn-muted" type="button" onClick={onBack}>Назад</button>
      <h1>Оплата бронирования</h1>
      <div className="summary-grid">
        <InfoCard title="Пункт" value={booking.storage} />
        <InfoCard title="Ячейки" value={booking.cells.join(', ')} />
        <InfoCard title="Начало" value={booking.start.replace('T', ' ')} />
        <InfoCard title="Сумма" value={money(booking.total)} />
      </div>
      <div className="payment-options">
        <button className="btn btn-primary" type="button" onClick={() => onPay('noop')}>Гарантированная оплата</button>
        <button className="btn btn-warm" type="button" onClick={() => onPay('random')}>Оплата с шансом 50%</button>
      </div>
    </div>
  );
}

function ProfilePage({ user, onSave }) {
  const [form, setForm] = useState(user);

  return (
    <form className="form-page" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <h1>Изменение личных данных</h1>
      <label>Логин<input value={form.login} onChange={(event) => setForm({ ...form, login: event.target.value })} /></label>
      <label>Имя<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Почта<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Роль<input value={form.operatorRole ? operatorRoleLabel(form.operatorRole) : roleLabel(form.role)} readOnly /></label>
      <label>Старый пароль<input type="password" placeholder="Старый пароль" /></label>
      <label>Новый пароль<input type="password" placeholder="Новый пароль" /></label>
      <label>Подтвердите новый пароль<input type="password" placeholder="Подтвердите новый пароль" /></label>
      <button className="btn btn-primary block" type="submit">Сохранить</button>
    </form>
  );
}

function BookingsPage({ title, bookings, onCancel }) {
  return (
    <div>
      <h1>{title}</h1>
      <DataTable
        columns={['Пункт', 'Ячейки', 'Начало', 'Часы', 'Статус', 'Сумма', 'Действие']}
        rows={bookings.map((booking) => [
          booking.storage,
          booking.cells.join(', '),
          booking.start.replace('T', ' '),
          booking.hours,
          <StatusBadge status={booking.status} />,
          money(booking.total),
          booking.status === 'Canceled' ? '—' : <button className="btn btn-danger sm" type="button" onClick={() => onCancel(booking.id)}>Отменить</button>,
        ])}
      />
    </div>
  );
}

function CreateStoragePage({ onCreate }) {
  const [form, setForm] = useState({
    name: 'SklaDinya Новый пункт',
    address: 'ул. Новая, 10',
    description: 'Пункт хранения рядом с торговым центром.',
    operatorLogin: 'NewOperator1',
    operatorPassword: 'NewOperator1',
    operatorName: 'Новый оператор',
    operatorEmail: 'operator@test.com',
  });

  return (
    <form className="form-page" onSubmit={(event) => { event.preventDefault(); onCreate(form); }}>
      <h1>Создание пункта хранения</h1>
      <label>Название<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label>Адрес<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
      <label>Описание<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <label>Логин оператора<input value={form.operatorLogin} onChange={(event) => setForm({ ...form, operatorLogin: event.target.value })} /></label>
      <label>Пароль оператора<input type="password" value={form.operatorPassword} onChange={(event) => setForm({ ...form, operatorPassword: event.target.value })} /></label>
      <label>Имя оператора<input value={form.operatorName} onChange={(event) => setForm({ ...form, operatorName: event.target.value })} /></label>
      <label>Почта оператора<input value={form.operatorEmail} onChange={(event) => setForm({ ...form, operatorEmail: event.target.value })} /></label>
      <button className="btn btn-primary block" type="submit">Отправить заявку</button>
    </form>
  );
}

function OperatorStoragePage({ storage, cells, bookings, onAddCell }) {
  const [form, setForm] = useState({ name: 'E-01', cellClass: 'Средняя', price: 45 });

  if (!storage) {
    return <EmptyState title="Пункт оператора пока не загружен" action="Обновить" onAction={() => window.location.reload()} />;
  }

  return (
    <div>
      <h1>Пункт хранения — {storage.name}</h1>
      <div className="summary-grid">
        <InfoCard title="Адрес" value={storage.address} />
        <InfoCard title="Статус" value={toHumanStatus(storage.status)} />
        <InfoCard title="Камер" value={cells.length} />
        <InfoCard title="Бронирований" value={bookings.length} />
      </div>

      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); onAddCell(form); }}>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Название" />
        <input value={form.cellClass} onChange={(event) => setForm({ ...form, cellClass: event.target.value })} placeholder="Класс" />
        <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Цена" />
        <button className="btn btn-primary" type="submit">Добавить ячейку</button>
      </form>

      <DataTable
        columns={['Название', 'Класс', 'Цена', 'Статус']}
        rows={cells.map((cell) => [cell.name, cell.cellClass, money(cell.price), cell.status])}
      />

      <h2 className="subheading">Бронирования в пункте</h2>
      <DataTable
        columns={['Ячейки', 'Начало', 'Часы', 'Статус']}
        rows={bookings.map((booking) => [booking.cells.join(', '), booking.start.replace('T', ' '), booking.hours, <StatusBadge status={booking.status} />])}
      />
    </div>
  );
}

function OperatorsPage({ operators }) {
  const [search, setSearch] = useState('');
  const filtered = operators.filter((operator) => (
    `${operator.username} ${operator.name} ${operator.email}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div>
      <h1>Операторы пункта</h1>
      <div className="inline-form">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по оператору..." />
        <button className="btn btn-blue" type="button">Найти</button>
      </div>
      <DataTable
        columns={['Логин', 'Имя', 'Почта', 'Роль', 'Заблокирован']}
        rows={filtered.map((operator) => [
          operator.username,
          operator.name,
          operator.email,
          operatorRoleLabel(operator.role),
          operator.banned ? 'Да' : 'Нет',
        ])}
      />
    </div>
  );
}

function UsersPage({ users, onToggleBlock }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter((user) => `${user.login} ${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1>Управление пользователями</h1>
      <div className="inline-form">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по имени..." />
        <button className="btn btn-blue" type="button">Найти</button>
        <button className="btn btn-danger" type="button" onClick={() => filtered[0] && onToggleBlock(filtered[0].id)}>Заблокировать</button>
        <button className="btn btn-primary" type="button">Создать</button>
      </div>
      <DataTable
        columns={['Логин', 'Имя', 'Почта', 'Роль', 'Заблокирован']}
        rows={filtered.map((user) => [
          user.login,
          user.name,
          user.email,
          roleLabel(user.role),
          user.blocked ? 'Да' : 'Нет',
        ])}
      />
    </div>
  );
}

function StorageRequestsPage({ storages, onApprove, onReject }) {
  return (
    <div>
      <h1>Заявки на пункты хранения</h1>
      <div className="inline-form">
        <button className="btn btn-primary" type="button" onClick={() => storages[0] && onApprove(storages[0].id)}>Одобрить</button>
        <button className="btn btn-danger" type="button" onClick={() => storages[0] && onReject(storages[0].id)}>Отклонить</button>
        <button className="btn btn-blue" type="button">Обновить</button>
      </div>
      <DataTable
        columns={['Название', 'Адрес', 'Статус', 'Создан', 'Действия']}
        rows={storages.map((storage) => [
          storage.name,
          storage.address,
          toHumanStatus(storage.status),
          storage.created,
          <div className="row-actions">
            <button className="btn btn-primary sm" type="button" onClick={() => onApprove(storage.id)}>Одобрить</button>
            <button className="btn btn-danger sm" type="button" onClick={() => onReject(storage.id)}>Отклонить</button>
          </div>,
        ])}
      />
    </div>
  );
}

function DataTable({ columns, rows }) {
  if (!rows.length) {
    return <div className="empty-table">Данных пока нет</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${row[0]}`}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoCard({ title, value }) {
  return (
    <div className="info-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{toHumanStatus(status)}</span>;
}

function EmptyState({ title, action, onAction }) {
  return (
    <div className="empty-state">
      <h1>{title}</h1>
      <button className="btn btn-primary" type="button" onClick={onAction}>{action}</button>
    </div>
  );
}

export default App;
