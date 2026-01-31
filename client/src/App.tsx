import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequestsIndex from './screens/requests/Index'
import RequestsShow from './screens/requests/Show'
import CommandsIndex from './screens/commands/Index'
import CommandsShow from './screens/commands/Show'
import ScheduleIndex from './screens/schedule/Index'
import JobsIndex from './screens/jobs/Index'
import JobsShow from './screens/jobs/Show'
import ExceptionsIndex from './screens/exceptions/Index'
import ExceptionsShow from './screens/exceptions/Show'
import LogsIndex from './screens/logs/Index'
import DumpsIndex from './screens/dumps/Index'
import QueriesIndex from './screens/queries/Index'
import QueriesShow from './screens/queries/Show'
import ModelsIndex from './screens/models/Index'
import EventsIndex from './screens/events/Index'
import MailIndex from './screens/mail/Index'
import NotificationsIndex from './screens/notifications/Index'
import GatesIndex from './screens/gates/Index'
import CacheIndex from './screens/cache/Index'
import RedisIndex from './screens/redis/Index'
import ViewsIndex from './screens/views/Index'
import ClientRequestsIndex from './screens/client-requests/Index'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RequestsIndex />} />
        <Route path="/requests" element={<RequestsIndex />} />
        <Route path="/requests/:id" element={<RequestsShow />} />
        <Route path="/commands" element={<CommandsIndex />} />
        <Route path="/commands/:id" element={<CommandsShow />} />
        <Route path="/schedule" element={<ScheduleIndex />} />
        <Route path="/jobs" element={<JobsIndex />} />
        <Route path="/jobs/:id" element={<JobsShow />} />
        <Route path="/exceptions" element={<ExceptionsIndex />} />
        <Route path="/exceptions/:id" element={<ExceptionsShow />} />
        <Route path="/logs" element={<LogsIndex />} />
        <Route path="/dumps" element={<DumpsIndex />} />
        <Route path="/queries" element={<QueriesIndex />} />
        <Route path="/queries/:id" element={<QueriesShow />} />
        <Route path="/models" element={<ModelsIndex />} />
        <Route path="/events" element={<EventsIndex />} />
        <Route path="/mail" element={<MailIndex />} />
        <Route path="/notifications" element={<NotificationsIndex />} />
        <Route path="/gates" element={<GatesIndex />} />
        <Route path="/cache" element={<CacheIndex />} />
        <Route path="/redis" element={<RedisIndex />} />
        <Route path="/views" element={<ViewsIndex />} />
        <Route path="/client-requests" element={<ClientRequestsIndex />} />
      </Routes>
    </Layout>
  )
}

export default App
