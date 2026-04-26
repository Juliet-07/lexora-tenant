import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModule } from "@/contexts/ModuleContext";
import { useNavigate } from "react-router-dom";

export function ModuleSwitcher() {
  const { currentModule, setModule, modules } = useModule();
  const navigate = useNavigate();
  const Icon = currentModule.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 px-3 gap-2 hover:bg-muted/60 border border-border/50"
        >
          <div
            className={`w-7 h-7 rounded-md bg-gradient-to-br ${currentModule.color} flex items-center justify-center`}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden sm:block leading-tight">
            <div className="text-xs text-muted-foreground">Module</div>
            <div className="text-sm font-semibold">{currentModule.shortName}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Switch module</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modules.map((m) => {
          const MIcon = m.icon;
          const active = m.id === currentModule.id;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => {
                setModule(m.id);
                navigate("/");
              }}
              className="gap-3 py-3 cursor-pointer"
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-md bg-gradient-to-br ${m.color} flex items-center justify-center`}
              >
                <MIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {m.name}
                  {active && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {m.scope}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
