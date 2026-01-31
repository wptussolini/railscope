import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequestsIndex from './screens/requests/Index'
import RequestsShow from './screens/requests/Show'
import QueriesIndex from './screens/queries/Index'
import QueriesShow from './screens/queries/Show'
import ExceptionsIndex from './screens/exceptions/Index'
import ExceptionsShow from './screens/exceptions/Show'
import JobsIndex from './screens/jobs/Index'
import JobsShow from './screens/jobs/Show'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RequestsIndex />} />
        <Route path="/requests" element={<RequestsIndex />} />
        <Route path="/requests/:id" element={<RequestsShow />} />
        <Route path="/queries" element={<QueriesIndex />} />
        <Route path="/queries/:id" element={<QueriesShow />} />
        <Route path="/exceptions" element={<ExceptionsIndex />} />
        <Route path="/exceptions/:id" element={<ExceptionsShow />} />
        <Route path="/jobs" element={<JobsIndex />} />
        <Route path="/jobs/:id" element={<JobsShow />} />
      </Routes>
    </Layout>
  )
}

export default App
