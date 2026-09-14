import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Role } from '@/types';
import { Layout } from '@/components/Layout';
import { LearnerList } from '@/features/learners/LearnerList';
import { LearnerDetail } from '@/features/learners/LearnerDetail';
import { ProgramDetail } from '@/features/programs/ProgramDetail';
import { ProgramBuilder } from '@/features/programs/ProgramBuilder';
import { SessionRunner } from '@/features/sessions/SessionRunner';
import { SessionList } from '@/features/sessions/SessionList';
import { SessionDetail } from '@/features/sessions/SessionDetail';
import { ProgressGraphs } from '@/features/graphs/ProgressGraphs';
import { SupervisorReview } from '@/features/review/SupervisorReview';

function App() {
  const [role, setRole] = useState<Role>('therapist');

  return (
    <BrowserRouter>
      <Layout role={role} onRoleChange={setRole}>
        <Routes>
          <Route path="/" element={<LearnerList />} />
          <Route path="/learners/:learnerId" element={<LearnerDetail />} />
          <Route path="/programs/new" element={<ProgramBuilder />} />
          <Route path="/programs/:programId" element={<ProgramDetail />} />
          <Route path="/programs/:programId/edit" element={<ProgramBuilder />} />
          <Route path="/sessions" element={<SessionList />} />
          <Route path="/sessions/new" element={<SessionRunner />} />
          <Route path="/sessions/:sessionId" element={<SessionDetail />} />
          <Route path="/sessions/:sessionId/run" element={<SessionRunner />} />
          <Route path="/graphs" element={<ProgressGraphs />} />
          <Route path="/review" element={<SupervisorReview />} />
          <Route path="/protocols" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
