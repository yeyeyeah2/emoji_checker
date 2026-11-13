/**
 * 演示模式用的内存 Mock API。
 *
 * 仅在 `VITE_USE_MOCK=true`（npm run dev:mock）时加载，接口路径、请求字段和
 * 响应结构与后端 /api/v1 保持一致，方便客户端在没有 PostgreSQL 环境时演示。
 */
import { ApiError } from './errors';
import type { QueryValue } from './query';
import type {
  AuthData,
  ClassSession,
  Course,
  DataEnvelope,
  EmojiRecord,
  EmojiType,
  Page,
  RosterStudent,
  Statistics,
  StatisticsGroup,
  User,
  UserRole,
} from './types';

interface MockUser extends User {
  password: string;
}

interface MockSchedule {
  session_id: string;
  user_id: string;
}

interface MockDb {
  users: MockUser[];
  courses: Course[];
  sessions: ClassSession[];
  schedule: MockSchedule[];
  records: EmojiRecord[];
}

interface MockRequestOptions {
  method: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const TEACHER_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT2_ID = '33333333-3333-4333-8333-333333333333';
const COURSE_SE_ID = '44444444-4444-4444-8444-444444444444';
const COURSE_DS_ID = '55555555-5555-4555-8555-555555555555';
const SESSION_LIVE_ID = '66666666-6666-4666-8666-666666666666';
const SESSION_UPCOMING_ID = '77777777-7777-4777-8777-777777777777';
const SESSION_PAST_ID = '88888888-8888-4888-8888-888888888888';
const SESSION_OTHER_ID = '99999999-9999-4999-8999-999999999999';

const EMOJI_TYPES: EmojiType[] = ['HAPPY', 'SAD', 'ANGRY', 'FEARFUL', 'SURPRISED', 'NEUTRAL'];

const db = seedDb();

export async function mockRequest<T>(path: string, options: MockRequestOptions): Promise<T> {
  await simulateLatency(options.signal);
  const method = options.method.toUpperCase();
  const query = options.query ?? {};
  const body = (options.body ?? {}) as Record<string, unknown>;

  if (path === '/auth/register' && method === 'POST') {
    return register(body) as unknown as T;
  }
  if (path === '/auth/login' && method === 'POST') {
    return login(body) as unknown as T;
  }
  if (path === '/users/me' && method === 'GET') {
    return { data: toUserOut(requireUser(options.token)) } as unknown as T;
  }
  if (path === '/auth/password' && method === 'PUT') {
    return changePassword(requireUser(options.token), body) as unknown as T;
  }
  if (path === '/courses' && method === 'GET') {
    return listCourses(requireUser(options.token), query) as unknown as T;
  }
  if (path === '/sessions' && method === 'GET') {
    return listSessions(requireUser(options.token), query) as unknown as T;
  }
  if (path === '/emoji/history' && method === 'GET') {
    return listHistory(requireUser(options.token), query) as unknown as T;
  }
  if (path === '/emoji' && method === 'POST') {
    return createEmoji(requireUser(options.token), body) as unknown as T;
  }
  if (path === '/statistics' && method === 'GET') {
    return statistics(requireUser(options.token), query) as unknown as T;
  }

  const roster = path.match(/^\/sessions\/([^/]+)\/schedule$/);
  if (roster && method === 'GET') {
    return rosterForSession(requireUser(options.token), roster[1]) as unknown as T;
  }

  throw new ApiError(404, 'not_found', '演示接口不存在。');
}

function seedDb(): MockDb {
  const now = new Date();
  const at = (offsetMinutes: number) => new Date(now.getTime() + offsetMinutes * 60_000).toISOString();
  const createdAt = at(-60 * 24 * 30);

  const users: MockUser[] = [
    {
      id: STUDENT_ID,
      username: 'student',
      email: 'student@example.com',
      password: 'student12345',
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: createdAt,
    },
    {
      id: TEACHER_ID,
      username: 'teacher',
      email: 'teacher@example.com',
      password: 'teacher12345',
      role: 'TEACHER',
      status: 'ACTIVE',
      created_at: createdAt,
    },
    {
      id: STUDENT2_ID,
      username: 'lin.xia',
      email: 'lin.xia@example.com',
      password: 'student12345',
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: createdAt,
    },
  ];

  const courses: Course[] = [
    {
      id: COURSE_SE_ID,
      code: 'SE101',
      name: '软件工程实践',
      teacher_id: TEACHER_ID,
      is_active: true,
      created_at: createdAt,
    },
    {
      id: COURSE_DS_ID,
      code: 'CS201',
      name: '数据结构',
      teacher_id: TEACHER_ID,
      is_active: true,
      created_at: createdAt,
    },
  ];

  const sessions: ClassSession[] = [
    {
      id: SESSION_LIVE_ID,
      course_id: COURSE_SE_ID,
      class_name: '软工 2301',
      starts_at: at(-25),
      ends_at: at(35),
      status: 'SCHEDULED',
      created_at: createdAt,
    },
    {
      id: SESSION_UPCOMING_ID,
      course_id: COURSE_SE_ID,
      class_name: '软工 2301',
      starts_at: at(120),
      ends_at: at(180),
      status: 'SCHEDULED',
      created_at: createdAt,
    },
    {
      id: SESSION_PAST_ID,
      course_id: COURSE_SE_ID,
      class_name: '软工 2301',
      starts_at: at(-60 * 26),
      ends_at: at(-60 * 25),
      status: 'SCHEDULED',
      created_at: createdAt,
    },
    {
      id: SESSION_OTHER_ID,
      course_id: COURSE_DS_ID,
      class_name: '计科 2302',
      starts_at: at(60 * 26),
      ends_at: at(60 * 27),
      status: 'SCHEDULED',
      created_at: createdAt,
    },
  ];

  const schedule: MockSchedule[] = [
    { session_id: SESSION_LIVE_ID, user_id: STUDENT_ID },
    { session_id: SESSION_LIVE_ID, user_id: STUDENT2_ID },
    { session_id: SESSION_UPCOMING_ID, user_id: STUDENT_ID },
    { session_id: SESSION_PAST_ID, user_id: STUDENT_ID },
    { session_id: SESSION_PAST_ID, user_id: STUDENT2_ID },
    { session_id: SESSION_OTHER_ID, user_id: STUDENT2_ID },
  ];

  const records: EmojiRecord[] = [];
  let sequence = 0;

  const addRecord = (
    sessionId: string,
    userId: string | null,
    emojiType: EmojiType,
    eventAt: string,
    source: 'MANUAL' | 'AI',
    confidence: number | null,
  ) => {
    sequence += 1;
    const receivedAt = new Date(new Date(eventAt).getTime() + 2_000).toISOString();
    records.push({
      id: `record-${sequence.toString().padStart(4, '0')}`,
      session_id: sessionId,
      user_id: userId,
      emoji_type: emojiType,
      source,
      event_at: eventAt,
      received_at: receivedAt,
      confidence,
      event_id: source === 'AI' ? `event-${sequence.toString().padStart(4, '0')}` : null,
      source_id: source === 'AI' ? 'mock-camera-1' : null,
    });
  };

  // 人工记录每种情绪 4 条，AI 记录按权重分布，让演示数据的图表更有层次。
  const aiWeights = [6, 2, 1, 3, 2, 4];
  EMOJI_TYPES.forEach((emojiType, index) => {
    addRecord(SESSION_LIVE_ID, STUDENT_ID, emojiType, at(-(3 + index * 2)), 'MANUAL', null);
    addRecord(SESSION_LIVE_ID, STUDENT2_ID, emojiType, at(-(4 + index * 2)), 'MANUAL', null);
    addRecord(SESSION_PAST_ID, STUDENT_ID, emojiType, at(-60 * 26 + 10 + index * 5), 'MANUAL', null);
    addRecord(SESSION_PAST_ID, STUDENT2_ID, emojiType, at(-60 * 26 + 12 + index * 5), 'MANUAL', null);

    const weight = aiWeights[index] ?? 2;
    for (let offset = 0; offset < weight; offset += 1) {
      const inLiveSession = offset % 2 === 0;
      const eventAt = inLiveSession
        ? at(-(2 + index * 2 + offset))
        : at(-60 * 26 + 8 + index * 4 + offset);
      addRecord(
        inLiveSession ? SESSION_LIVE_ID : SESSION_PAST_ID,
        null,
        emojiType,
        eventAt,
        'AI',
        Math.min(0.68 + ((index + offset) % 6) * 0.05, 0.98),
      );
    }
  });

  return { users, courses, sessions, schedule, records };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const digit = char === 'x' ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

function simulateLatency(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 140 + Math.random() * 220);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function toUserOut(user: MockUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

function authEnvelope(user: MockUser): DataEnvelope<AuthData> {
  return {
    data: {
      access_token: `mock-token:${user.id}`,
      token_type: 'bearer',
      expires_in: 1800,
      user: toUserOut(user),
    },
  };
}

function requireUser(token?: string | null): MockUser {
  const id = token?.startsWith('mock-token:') ? token.slice('mock-token:'.length) : null;
  const user = id ? db.users.find((item) => item.id === id) : undefined;
  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'invalid_credentials', '登录凭证无效或已过期。');
  }
  return user;
}

function requireStaff(user: MockUser): void {
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    throw new ApiError(403, 'forbidden', '没有访问权限。');
  }
}

function register(body: Record<string, unknown>): DataEnvelope<AuthData> {
  const username = String(body.username ?? '').trim().toLowerCase();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = String(body.role ?? 'STUDENT') as UserRole;

  if (role !== 'STUDENT' && role !== 'TEACHER') {
    throw new ApiError(403, 'forbidden', '客户端仅支持学生或教师注册。');
  }
  if (!/^[a-z0-9_.-]{3,64}$/.test(username)) {
    throw new ApiError(422, 'validation_error', '用户名需为 3–64 位字母、数字、下划线、点或短横线。');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(422, 'validation_error', '请输入有效的邮箱地址。');
  }
  if (password.length < 12) {
    throw new ApiError(422, 'validation_error', '密码至少需要 12 位。');
  }
  if (db.users.some((item) => item.username === username)) {
    throw new ApiError(409, 'conflict', '用户名已被使用。');
  }
  if (db.users.some((item) => item.email === email)) {
    throw new ApiError(409, 'conflict', '邮箱已被使用。');
  }

  const user: MockUser = {
    id: newId(),
    username,
    email,
    password,
    role,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  return authEnvelope(user);
}

function login(body: Record<string, unknown>): DataEnvelope<AuthData> {
  const identifier = String(body.identifier ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const user = db.users.find((item) => item.username === identifier || item.email === identifier);
  if (!user || user.password !== password || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'invalid_credentials', '用户名/邮箱或密码错误。');
  }
  return authEnvelope(user);
}

function changePassword(user: MockUser, body: Record<string, unknown>): DataEnvelope<{ updated: boolean }> {
  const currentPassword = String(body.current_password ?? '');
  const newPassword = String(body.new_password ?? '');
  if (user.password !== currentPassword) {
    throw new ApiError(400, 'invalid_credentials', '当前密码错误。');
  }
  if (newPassword.length < 12) {
    throw new ApiError(422, 'validation_error', '新密码至少需要 12 位。');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(422, 'validation_error', '新密码不能与当前密码相同。');
  }
  user.password = newPassword;
  return { data: { updated: true } };
}

function listCourses(user: MockUser, query: Record<string, QueryValue>): Page<Course> {
  let courses = db.courses;
  if (user.role === 'TEACHER') {
    courses = courses.filter((course) => course.teacher_id === user.id);
  } else if (user.role === 'STUDENT') {
    const courseIds = new Set(
      db.schedule
        .filter((item) => item.user_id === user.id)
        .map((item) => db.sessions.find((session) => session.id === item.session_id)?.course_id)
        .filter((value): value is string => Boolean(value)),
    );
    courses = courses.filter((course) => courseIds.has(course.id));
  }
  return paginate(courses, query);
}

function visibleSessions(user: MockUser): ClassSession[] {
  if (user.role === 'ADMIN') return db.sessions;
  if (user.role === 'TEACHER') {
    const courseIds = new Set(db.courses.filter((course) => course.teacher_id === user.id).map((course) => course.id));
    return db.sessions.filter((session) => courseIds.has(session.course_id));
  }
  const sessionIds = new Set(db.schedule.filter((item) => item.user_id === user.id).map((item) => item.session_id));
  return db.sessions.filter((session) => sessionIds.has(session.id));
}

function listSessions(user: MockUser, query: Record<string, QueryValue>): Page<ClassSession> {
  let sessions = visibleSessions(user);
  const courseId = readString(query.course_id);
  const from = readString(query.from);
  const to = readString(query.to);

  if (courseId) sessions = sessions.filter((session) => session.course_id === courseId);
  if (from) sessions = sessions.filter((session) => new Date(session.ends_at) > new Date(from));
  if (to) sessions = sessions.filter((session) => new Date(session.starts_at) < new Date(to));

  sessions = [...sessions].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return paginate(sessions, query);
}

function visibleRecords(user: MockUser): EmojiRecord[] {
  if (user.role === 'ADMIN') return db.records;
  if (user.role === 'STUDENT') return db.records.filter((record) => record.user_id === user.id);
  const courseIds = new Set(db.courses.filter((course) => course.teacher_id === user.id).map((course) => course.id));
  const sessionIds = new Set(db.sessions.filter((session) => courseIds.has(session.course_id)).map((session) => session.id));
  return db.records.filter((record) => sessionIds.has(record.session_id));
}

function filterRecords(records: EmojiRecord[], query: Record<string, QueryValue>): EmojiRecord[] {
  const sessionId = readString(query.session_id);
  const courseId = readString(query.course_id);
  const userId = readString(query.user_id);
  const emojiType = readString(query.emoji_type);
  const source = readString(query.source);
  const from = readString(query.from);
  const to = readString(query.to);
  const className = readString(query.class);

  return records.filter((record) => {
    if (sessionId && record.session_id !== sessionId) return false;
    if (userId && record.user_id !== userId) return false;
    if (emojiType && record.emoji_type !== emojiType) return false;
    if (source && record.source !== source) return false;
    if (courseId && sessionCourseId(record.session_id) !== courseId) return false;
    if (className && sessionFor(record.session_id)?.class_name !== className) return false;
    if (from && new Date(record.event_at) < new Date(from)) return false;
    if (to && new Date(record.event_at) >= new Date(to)) return false;
    return true;
  });
}

function listHistory(user: MockUser, query: Record<string, QueryValue>): Page<EmojiRecord> {
  let records = visibleRecords(user);
  if (user.role === 'STUDENT' && readString(query.user_id) && readString(query.user_id) !== user.id) {
    throw new ApiError(403, 'forbidden', '学生不能查询其他用户记录。');
  }
  records = filterRecords(records, query);
  records = [...records].sort((a, b) => {
    const byTime = new Date(b.event_at).getTime() - new Date(a.event_at).getTime();
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
  return paginate(records, query);
}

function createEmoji(user: MockUser, body: Record<string, unknown>): DataEnvelope<EmojiRecord> {
  if (user.role !== 'STUDENT') {
    throw new ApiError(403, 'forbidden', '只有学生可以提交情绪记录。');
  }
  const sessionId = String(body.session_id ?? '');
  const emojiType = String(body.emoji_type ?? '') as EmojiType;
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new ApiError(404, 'not_found', '课堂不存在。');
  if (!EMOJI_TYPES.includes(emojiType)) {
    throw new ApiError(422, 'validation_error', 'emoji_type 不合法。');
  }

  const course = db.courses.find((item) => item.id === session.course_id);
  const now = Date.now();
  const isLive =
    session.status === 'SCHEDULED' &&
    new Date(session.starts_at).getTime() <= now &&
    now < new Date(session.ends_at).getTime();
  const scheduled = db.schedule.some((item) => item.session_id === sessionId && item.user_id === user.id);

  if (!course?.is_active || !isLive || !scheduled) {
    throw new ApiError(409, 'session_not_active', '课堂当前不在进行中。');
  }

  const timestamp = new Date().toISOString();
  const record: EmojiRecord = {
    id: newId(),
    session_id: sessionId,
    user_id: user.id,
    emoji_type: emojiType,
    source: 'MANUAL',
    event_at: timestamp,
    received_at: timestamp,
    confidence: null,
    event_id: null,
    source_id: null,
  };
  db.records.push(record);
  return { data: record };
}

function rosterForSession(user: MockUser, sessionId: string): DataEnvelope<RosterStudent[]> {
  requireStaff(user);
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new ApiError(404, 'not_found', '课堂不存在。');
  const course = db.courses.find((item) => item.id === session.course_id);
  if (user.role === 'TEACHER' && course?.teacher_id !== user.id) {
    throw new ApiError(403, 'forbidden', '没有访问该课堂的权限。');
  }
  const ids = new Set(db.schedule.filter((item) => item.session_id === sessionId).map((item) => item.user_id));
  const students = db.users
    .filter((item) => ids.has(item.id))
    .map((item) => ({ id: item.id, username: item.username }))
    .sort((a, b) => a.username.localeCompare(b.username));
  return { data: students };
}

function statistics(user: MockUser, query: Record<string, QueryValue>): DataEnvelope<Statistics> {
  requireStaff(user);
  const records = filterRecords(visibleRecords(user), query);
  const dims = String(query.group_by ?? 'emoji_type')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const allowed = new Set(['course', 'class', 'session', 'emoji_type', 'source']);
  if (dims.some((dim) => !allowed.has(dim)) || dims.length !== new Set(dims).size) {
    throw new ApiError(422, 'validation_error', 'group_by 包含不支持或重复的维度。');
  }
  const bucket = query.bucket === 'hour' || query.bucket === 'day' ? query.bucket : null;

  interface AggregatedGroup extends StatisticsGroup {
    students: Set<string>;
  }

  const grouped = new Map<string, AggregatedGroup>();
  for (const record of records) {
    const values: Record<string, string | null> = {
      course: courseFor(record.session_id)?.code ?? null,
      class: sessionFor(record.session_id)?.class_name ?? null,
      session: record.session_id,
      emoji_type: record.emoji_type,
      source: record.source,
      period: bucket ? truncate(record.event_at, bucket) : null,
    };
    const keys = [...dims.map((dim) => `${dim}:${values[dim] ?? ''}`), ...(bucket ? [`period:${values.period}`] : [])];
    const key = keys.join('|');
    let group = grouped.get(key);
    if (!group) {
      group = {
        record_count: 0,
        percentage: 0,
        manual_count: 0,
        ai_count: 0,
        student_count: 0,
        students: new Set<string>(),
      };
      for (const dim of dims) {
        if (dim === 'emoji_type') group.emoji_type = values.emoji_type as EmojiType;
        if (dim === 'source') group.source = values.source as 'MANUAL' | 'AI';
        if (dim === 'course') group.course = values.course;
        if (dim === 'class') group.class = values.class;
        if (dim === 'session') group.session = values.session;
      }
      if (bucket) group.period = values.period;
      grouped.set(key, group);
    }
    group.record_count += 1;
    if (record.source === 'MANUAL') group.manual_count += 1;
    else group.ai_count += 1;
    if (record.user_id) group.students.add(record.user_id);
  }

  const total = records.length;
  const groups = [...grouped.values()].map(({ students, ...group }) => {
    group.student_count = students.size;
    group.percentage = total ? Math.round((group.record_count * 10000) / total) / 100 : 0;
    return group;
  });

  const summary: Statistics = {
    total_records: total,
    manual_records: records.filter((record) => record.source === 'MANUAL').length,
    ai_records: records.filter((record) => record.source === 'AI').length,
    student_count: new Set(records.map((record) => record.user_id).filter(Boolean)).size,
    groups,
  };
  return { data: summary };
}

function paginate<T>(items: T[], query: Record<string, QueryValue>): Page<T> {
  const limit = Math.min(Math.max(readNumber(query.limit, 50), 1), 100);
  const offset = Math.max(readNumber(query.offset, 0), 0);
  return {
    data: items.slice(offset, offset + limit),
    meta: { limit, offset, total: items.length },
  };
}

function readString(value: QueryValue | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function readNumber(value: QueryValue | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sessionFor(sessionId: string): ClassSession | undefined {
  return db.sessions.find((item) => item.id === sessionId);
}

function courseFor(sessionId: string): Course | undefined {
  const session = sessionFor(sessionId);
  return session ? db.courses.find((course) => course.id === session.course_id) : undefined;
}

function sessionCourseId(sessionId: string): string | undefined {
  return sessionFor(sessionId)?.course_id;
}

function truncate(iso: string, bucket: 'hour' | 'day'): string {
  const date = new Date(iso);
  if (bucket === 'hour') date.setUTCMinutes(0, 0, 0);
  else date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}
