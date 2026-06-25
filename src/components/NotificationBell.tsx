import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useNotifications } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INFRACTIONS } from "@/lib/data";

const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          aria-label="Notifications"
          className="relative h-12 w-12 rounded-full shadow-lg glow hover:scale-105 transition-transform"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-strong rounded-xl" side="top" align="start">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1 rounded-full" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications yet</p>
          ) : (
            notifications.map((n) => {
              const isDispute = n.infraction === "dispute_upheld" || n.infraction === "dispute_denied";
              const inf = INFRACTIONS.find((i) => i.type === n.infraction);
              const linkTo = isDispute ? "/profile" : `/plate/${encodeURIComponent(n.plate_number)}`;
              return (
                <Link
                  key={n.id}
                  to={linkTo}
                  className={`block px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      {isDispute ? (
                        <p className="text-sm">
                          Your dispute for <span className="font-mono font-bold">{n.plate_number}</span> was{" "}
                          <span className={`font-medium ${n.infraction === "dispute_upheld" ? "text-emerald-600" : "text-destructive"}`}>
                            {n.infraction === "dispute_upheld" ? "upheld — the post has been removed" : "denied"}
                          </span>
                        </p>
                      ) : n.infraction === "unspecified" ? (
                        <p className="text-sm">
                          <span className="font-mono font-bold">{n.plate_number}</span> was reported
                        </p>
                      ) : (
                        <p className="text-sm">
                          <span className="font-mono font-bold">{n.plate_number}</span>{" "}
                          was reported for{" "}
                          <span className="font-medium">{inf?.label || n.infraction.replace(/_/g, " ")}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {!isDispute && <>{n.location} · </>}
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
