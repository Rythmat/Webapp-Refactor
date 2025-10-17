import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvitationsList } from './components/InvitationsList';
import { InviteTeacherDialog } from './components/InviteTeacherDialog';
import { RemoveTeacherDialog } from './components/RemoveTeacherDialog';
import { TeachersList } from './components/TeachersList';

export const TeacherManagementPage = () => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>();
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>();
  const [activeTab, setActiveTab] = useState('teachers');

  const handleRemoveTeacher = (id: string, name: string) => {
    setSelectedTeacherId(id);
    setSelectedTeacherName(name);
    setIsRemoveDialogOpen(true);
  };

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground">
            Manage teachers and their invitations
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          Invite Teacher
        </Button>
      </div>

      <Tabs
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers">
          <TeachersList
            openInviteDialog={() => setIsInviteDialogOpen(true)}
            onRemoveTeacher={handleRemoveTeacher}
          />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsList />
        </TabsContent>
      </Tabs>

      <InviteTeacherDialog
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      <RemoveTeacherDialog
        isOpen={isRemoveDialogOpen}
        teacherId={selectedTeacherId}
        teacherName={selectedTeacherName}
        onOpenChange={setIsRemoveDialogOpen}
      />
    </div>
  );
};
