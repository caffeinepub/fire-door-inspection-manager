import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  DoorOpen,
  Flame,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  type Checklist,
  DoorMaterial,
  DoorType,
  FireRating,
  FrameMaterial,
  type InspectionStatus,
  LeafConfig,
} from "./backend";
import type { Door, Inspection } from "./backend";
import { ProfileSetupModal } from "./components/ProfileSetupModal";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useAddDoor,
  useGetAllDoors,
  useGetCallerUserProfile,
  useGetInspectionsForDoor,
  useIsCallerAdmin,
} from "./hooks/useQueries";
import { Dashboard } from "./pages/Dashboard";
import { DoorDetailPage } from "./pages/DoorDetailPage";
import { DoorsPage } from "./pages/DoorsPage";
import { InspectionForm } from "./pages/InspectionForm";

type Page = "dashboard" | "doors" | "door-detail" | "inspect";

export interface LastInspectionInfo {
  date: bigint;
  status: InspectionStatus;
  checklist: Checklist;
}

const SAMPLE_DOORS: Omit<Door, "id" | "createdAt">[] = [
  {
    company: "Acme Property Management",
    building: "Block A",
    floor: "Ground",
    location: "Main Entrance",
    doorType: DoorType.single,
    doorMaterial: DoorMaterial.timber,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.sixtyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "Main public entrance, high traffic",
    active: true,
  },
  {
    company: "Acme Property Management",
    building: "Block A",
    floor: "Ground",
    location: "Stairwell A1",
    doorType: DoorType.single,
    doorMaterial: DoorMaterial.steel,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.ninetyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "",
    active: true,
  },
  {
    company: "Acme Property Management",
    building: "Block A",
    floor: "1st",
    location: "Corridor A-101",
    doorType: DoorType.double_,
    doorMaterial: DoorMaterial.timber,
    frameMaterial: FrameMaterial.timber,
    fireRating: FireRating.sixtyMinutes,
    leafConfig: LeafConfig.doubleLeaf,
    notes: "Adjacent to kitchen area",
    active: true,
  },
  {
    company: "Riverside Estates",
    building: "Block B",
    floor: "Ground",
    location: "Reception",
    doorType: DoorType.hinged,
    doorMaterial: DoorMaterial.aluminium,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.thirtyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "",
    active: true,
  },
  {
    company: "Riverside Estates",
    building: "Block B",
    floor: "Ground",
    location: "Plant Room B-01",
    doorType: DoorType.single,
    doorMaterial: DoorMaterial.steel,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.oneHundredTwentyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "High fire risk area",
    active: true,
  },
  {
    company: "Riverside Estates",
    building: "Block B",
    floor: "2nd",
    location: "Stairwell B2",
    doorType: DoorType.single,
    doorMaterial: DoorMaterial.timber,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.sixtyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "",
    active: true,
  },
  {
    company: "Skyline Developments",
    building: "Block C",
    floor: "Ground",
    location: "Loading Bay",
    doorType: DoorType.sliding,
    doorMaterial: DoorMaterial.steel,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.sixtyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "Heavy duty industrial use",
    active: true,
  },
  {
    company: "Skyline Developments",
    building: "Block C",
    floor: "1st",
    location: "Server Room C-1A",
    doorType: DoorType.single,
    doorMaterial: DoorMaterial.hybrid,
    frameMaterial: FrameMaterial.metal,
    fireRating: FireRating.ninetyMinutes,
    leafConfig: LeafConfig.singleLeaf,
    notes: "Critical infrastructure",
    active: true,
  },
];

export default function App() {
  const { login, clear, isLoggingIn, identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();
  const { data: isAdmin = false } = useIsCallerAdmin();
  const { data: doors = [] } = useGetAllDoors();
  const addDoor = useAddDoor();

  const [page, setPage] = useState<Page>("dashboard");
  const [activeDoorId, setActiveDoorId] = useState<bigint | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);

  // Parse URL params on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const doorIdParam = params.get("doorId");
    const pageParam = params.get("page");
    if (doorIdParam && pageParam === "inspect") {
      setActiveDoorId(BigInt(doorIdParam));
      setPage("inspect");
    }
  }, []);

  // Seed sample data
  // biome-ignore lint/correctness/useExhaustiveDependencies: addDoor.mutateAsync is stable
  useEffect(() => {
    if (
      !actor ||
      actorFetching ||
      seeded ||
      !isAuthenticated ||
      userProfile === null
    )
      return;
    const seed = async () => {
      try {
        const count = await actor.getDoorCount();
        if (count === BigInt(0)) {
          for (const d of SAMPLE_DOORS) {
            await addDoor.mutateAsync({
              id: BigInt(0),
              createdAt: BigInt(Date.now()) * 1000000n,
              ...d,
            });
          }
        }
        setSeeded(true);
      } catch {
        setSeeded(true);
      }
    };
    seed();
  }, [actor, actorFetching, isAuthenticated, seeded]);

  // Load inspections for all doors to build lastInspectionMap
  useEffect(() => {
    if (!actor || actorFetching || doors.length === 0) return;
    const fetchAll = async () => {
      const results = await Promise.all(
        doors.map((d) =>
          actor.getInspectionsForDoor(d.id).catch(() => [] as Inspection[]),
        ),
      );
      setAllInspections(results.flat());
    };
    fetchAll();
  }, [actor, actorFetching, doors]);

  const lastInspectionMap = (() => {
    const map: Record<string, LastInspectionInfo> = {};
    for (const insp of allInspections) {
      const key = insp.doorId.toString();
      if (!map[key] || insp.inspectionDate > map[key].date) {
        map[key] = {
          date: insp.inspectionDate,
          status: insp.overallStatus,
          checklist: insp.checklist,
        };
      }
    }
    return map;
  })();

  const navigate = useCallback((p: Page, doorId?: bigint) => {
    setPage(p);
    setActiveDoorId(doorId ?? null);
    setMobileMenuOpen(false);
  }, []);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  const navItems = [
    { label: "Dashboard", page: "dashboard" as Page, icon: LayoutDashboard },
    { label: "Doors", page: "doors" as Page, icon: DoorOpen },
    { label: "Inspect", page: "inspect" as Page, icon: ClipboardList },
  ];

  if (!isAuthenticated && !isLoggingIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-card-hover p-10 max-w-sm w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-12 h-12 rounded-xl bg-fire-red flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Fire Door Inspector
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Professional fire door inspection management. Track, inspect and
            report on all fire doors in your buildings.
          </p>
          <Button
            onClick={handleAuth}
            className="w-full bg-fire-red hover:bg-fire-red-dark text-white py-3 text-base"
            disabled={isLoggingIn}
            data-ocid="login.primary_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Login to Continue
              </>
            )}
          </Button>
        </div>
        <footer className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-fire-red text-white shadow-md sticky top-0 z-40 no-print">
        <div className="max-w-[1100px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate("dashboard")}
              className="flex items-center gap-2 font-bold text-lg tracking-tight"
            >
              <Flame className="w-5 h-5" />
              <span>Fire Door Inspector</span>
            </button>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  type="button"
                  key={item.page}
                  onClick={() => navigate(item.page)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    page === item.page ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                  data-ocid={`nav.${item.page}.link`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {userProfile && (
              <div className="hidden sm:flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{userProfile.name}</span>
                {isAdmin && (
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-semibold">
                    ADMIN
                  </span>
                )}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAuth}
              className="hidden sm:flex text-white hover:bg-white/10 hover:text-white"
              data-ocid="header.logout.button"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Logout
            </Button>
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden p-1"
              onClick={() => setMobileMenuOpen((p) => !p)}
              data-ocid="header.menu.button"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-fire-red-dark border-t border-white/20 px-4 pb-3"
          >
            {navItems.map((item) => (
              <button
                type="button"
                key={item.page}
                onClick={() => navigate(item.page)}
                className="flex items-center gap-2 w-full py-2.5 text-sm font-medium border-b border-white/10 last:border-0"
                data-ocid={`mobile_nav.${item.page}.link`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAuth}
              className="flex items-center gap-2 w-full py-2.5 text-sm font-medium mt-1"
              data-ocid="mobile_nav.logout.button"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </motion.div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 py-6">
        {actorFetching ? (
          <div
            className="flex items-center justify-center py-20"
            data-ocid="app.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin text-fire-red" />
          </div>
        ) : (
          <motion.div
            key={page + (activeDoorId?.toString() ?? "")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {page === "dashboard" && (
              <Dashboard
                onNavigate={navigate}
                lastInspectionMap={lastInspectionMap}
              />
            )}
            {page === "doors" && (
              <DoorsPage
                isAdmin={true}
                onNavigate={navigate}
                lastInspectionMap={lastInspectionMap}
              />
            )}
            {page === "door-detail" && activeDoorId !== null && (
              <DoorDetailPage doorId={activeDoorId} onNavigate={navigate} />
            )}
            {page === "inspect" && (
              <InspectionForm
                preselectedDoorId={activeDoorId}
                inspectorName={userProfile?.name ?? ""}
                onNavigate={navigate}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          caffeine.ai
        </a>
      </footer>

      <ProfileSetupModal open={showProfileSetup} />
      <Toaster />
    </div>
  );
}
