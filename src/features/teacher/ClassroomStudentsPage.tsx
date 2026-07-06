import { Search, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClassroom, useClassroomStudents } from '@/hooks/data';
import { InviteStudentDialog } from './components/InviteStudentDialog';

export const ClassroomStudentsPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const { data: classroom } = useClassroom(classroomId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'removed'
  >('active');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const {
    data: students = [],
    isLoading,
    isError,
  } = useClassroomStudents(classroomId, { status: statusFilter });

  const filteredStudents = students.filter(
    (student) =>
      student.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-6 px-6 py-6 md:gap-10 md:px-10 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <Users className="h-6 w-6 text-white/85 md:h-7 md:w-7" />
            <h1 className="text-xl font-medium text-white md:text-2xl">
              Students
            </h1>
          </div>
          <p className="text-sm text-white/60">
            {classroom?.name
              ? `Roster for ${classroom.name}`
              : 'Manage students in your classroom'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          <UserPlus className="h-4 w-4" />
          Invite Student
        </button>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium text-white">Class Roster</h2>
            <p className="text-xs text-white/50">
              {filteredStudents.length}{' '}
              {filteredStudents.length === 1 ? 'student' : 'students'}
              {classroom?.name && ` in ${classroom.name}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                className="w-full rounded-full border border-white/10 bg-white/[0.02] px-9 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
                placeholder="Search students…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: 'all' | 'active' | 'removed') =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-32 rounded-full border-white/10 bg-white/[0.02] text-sm text-white/80">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-full animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-white/60">
              There was an error loading students. Please try again.
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-white/60">
              {searchQuery
                ? 'No students match your search criteria.'
                : 'No students in this classroom yet.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsInviteDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
              >
                <UserPlus className="h-4 w-4" />
                Invite Your First Student
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {filteredStudents.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </ul>
        )}
      </div>

      {classroom?.code && classroomId && (
        <InviteStudentDialog
          classroomCode={classroom.code}
          classroomId={classroomId}
          isOpen={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}
    </div>
  );
};

interface StudentRowProps {
  student: {
    id: string;
    nickname: string;
    username: string | null;
    removedAt?: string | Date | null;
  };
}

const StudentRow = ({ student }: StudentRowProps) => {
  const isRemoved = Boolean(student.removedAt);
  const initial = student.nickname.charAt(0).toUpperCase() || '·';
  return (
    <li className="flex items-center gap-4 px-2 py-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-medium text-white/80">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {student.nickname}
        </div>
        {student.username && (
          <div className="truncate text-xs text-white/50">
            {student.username}
          </div>
        )}
      </div>
      <span
        className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs ${
          isRemoved
            ? 'bg-white/[0.03] text-white/40'
            : 'bg-white/[0.06] text-white/75'
        }`}
      >
        {isRemoved ? 'Removed' : 'Active'}
      </span>
    </li>
  );
};
