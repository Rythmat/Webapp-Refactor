import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollectionsClassPage } from './CollectionsClassPage';

export const LearnHomePage = () => {
  const [activeTab, setActiveTab] = useState('theory');

  return (
    <div className="animate-fade-in-bottom space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Learn</h1>
          <p className="text-muted-foreground">
            The extensive Atlas catalog
          </p>
        </div>
      </div>

      <Tabs
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="theory">Theory</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          {/* <TeachersList
            openInviteDialog={() => setIsInviteDialogOpen(true)}
            onRemoveTeacher={handleRemoveTeacher}
          /> */}
        </TabsContent>

        <TabsContent value="theory">
          <CollectionsClassPage/>
        </TabsContent>
        <TabsContent value="explore">

        </TabsContent>
      </Tabs>

    </div>
  );
};
