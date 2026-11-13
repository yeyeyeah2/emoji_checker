import { AppShell } from '../components/AppShell';

export function AdminPage() {
  return (
    <AppShell>
      <div className="narrow-page">
        <section className="panel-card admin-notice">
          <span className="admin-notice-icon" aria-hidden="true">
            🛠️
          </span>
          <p className="eyebrow">管理员账号</p>
          <h1>请使用管理端 Web</h1>
          <p>
            当前客户端面向学生与教师的必做功能。管理员的数据查看、CSV 导出、实时课堂看板与多维统计图表由管理端 Web 提供。
          </p>
          <p className="muted-text">如需退出当前账号，请使用右上角的「退出」按钮。</p>
        </section>
      </div>
    </AppShell>
  );
}
