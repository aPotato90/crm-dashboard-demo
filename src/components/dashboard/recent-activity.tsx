import { formatDistance } from "date-fns";
import {
  MailIcon,
  PhoneIcon,
  StickyNoteIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityType, WithId, ActivityData } from "@/lib/crm";
import { ACTIVITY_LABELS } from "@/lib/crm/labels";

const ICONS: Record<ActivityType, typeof PhoneIcon> = {
  call: PhoneIcon,
  email: MailIcon,
  meeting: UsersRoundIcon,
  note: StickyNoteIcon,
};

export function RecentActivity({
  activities,
  contactNames,
  now,
}: {
  activities: WithId<ActivityData>[];
  contactNames: Map<string, string>;
  now: Date;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="font-semibold">
          <h2>Recent activity</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-4">
            {activities.map((activity) => {
              const Icon = ICONS[activity.type];
              const name =
                contactNames.get(activity.contactId) ?? "Unknown contact";
              return (
                <li key={activity.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon
                      aria-hidden
                      className="size-3.5 text-muted-foreground"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {ACTIVITY_LABELS[activity.type]}
                      </span>
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {activity.summary}
                    </p>
                    <time
                      dateTime={activity.createdAt.toISOString()}
                      title={activity.createdAt.toLocaleString()}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDistance(activity.createdAt, now, {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
