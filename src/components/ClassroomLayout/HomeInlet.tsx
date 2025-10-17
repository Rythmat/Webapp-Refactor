import { PlayerMetrics } from "../Games/PlayerMetrics"
import { ProfileBanner } from "../Profile/ProfileBanner";
import { Card, CardTitle } from "../ui/card";


export const HomeInlet = () => {
  return (
    <div className="space-y-6">
      <PlayerMetrics/>
      <ProfileBanner/>
      <div className="mx-auto grid max-w-5xl gap-4 px-4 md:grid-cols-2 md:gap-12">
        <div className="space-y-3">
          <Card>
            <CardTitle>Lessons</CardTitle>
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <CardTitle>Projects</CardTitle>
          </Card>
        </div>
        <div className="space-y-3">
          <Card>
            <CardTitle>Generate</CardTitle>
          </Card>
        </div>
      </div>
    </div>
    
  );
};
