'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useSessionState } from '@/features/session/session-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { getMyModules, type TeacherModuleSummary } from '@/lib/teacher-api';

export default function SessionSetupPage() {
  const { isActive, startSession } = useSessionState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [modules, setModules] = React.useState<TeacherModuleSummary[]>([]);
  const [selectedModuleId, setSelectedModuleId] = React.useState<string>('');
  const [room, setRoom] = React.useState('');
  const [isLoadingModules, setIsLoadingModules] = React.useState(false);

  React.useEffect(() => {
    const moduleId = searchParams.get('moduleId');
    const roomParam = searchParams.get('room');
    if (moduleId) setSelectedModuleId(moduleId);
    if (roomParam) setRoom(roomParam);
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!token) return;
    let mounted = true;
    setIsLoadingModules(true);
    getMyModules(token)
      .then((result) => {
        if (!mounted) return;
        const next = result.modules ?? [];
        setModules(next);
        if (!selectedModuleId && next[0]) {
          setSelectedModuleId(String(next[0].module_id));
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des modules');
      })
      .finally(() => setIsLoadingModules(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  const selectedModule = React.useMemo(() => {
    const id = Number(selectedModuleId);
    return modules.find((m) => m.module_id === id) ?? null;
  }, [modules, selectedModuleId]);

  // Préremplir la salle depuis le module sélectionné.
  React.useEffect(() => {
    if (selectedModule?.module_room) setRoom(selectedModule.module_room);
  }, [selectedModule]);

  const hasAssignedModules = modules.length > 0;
  const [durationInput, setDurationInput] = React.useState(90);

  return (
    <div className='flex w-full flex-col gap-6 p-4'>
      <Card>
        <CardHeader>
          <CardTitle>Créer une séance</CardTitle>
          <CardDescription>
            Démarrez une séance de présence, générez un code et lancez le flux QR/AP.
          </CardDescription>
        </CardHeader>
      </Card>

      {!hasAssignedModules ? (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>Aucun module affecté</AlertTitle>
          <AlertDescription>
            Vous n'êtes affecté à aucun module. Contactez l'administrateur.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>Détails de la séance</CardTitle>
            <CardDescription>
              Confirmez le contexte de l'emploi du temps ou ajustez les champs.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <Alert>
              <IconAlertTriangle />
              <AlertTitle>Aperçu de la séance</AlertTitle>
              <AlertDescription>
                {(selectedModule?.module_code ?? '—')} - {room}
              </AlertDescription>
            </Alert>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='grid gap-2 md:col-span-2'>
                <Label htmlFor='module'>Module</Label>
                <Select
                  value={selectedModuleId}
                  onValueChange={setSelectedModuleId}
                  disabled={isLoadingModules || !hasAssignedModules}
                >
                  <SelectTrigger id='module'>
                    <SelectValue placeholder='Sélectionner un module' />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => (
                      <SelectItem
                        key={module.module_id}
                        value={String(module.module_id)}
                      >
                        {module.module_code} - {module.module_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='room'>Salle</Label>
                <Input
                  id='room'
                  value={room}
                  onChange={(event) => setRoom(event.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='duration'>Durée (minutes)</Label>
                <Input
                  id='duration'
                  type='number'
                  min={15}
                  max={240}
                  value={durationInput}
                  onChange={(event) => setDurationInput(Number(event.target.value))}
                />
                <p className='text-muted-foreground text-xs'>
                  La séance démarre immédiatement à la création.
                </p>
              </div>
            </div>

            <div className='border-border/60 bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4'>
              <div>
                <p className='text-sm font-medium'>Ce qui va se passer</p>
                <p className='text-muted-foreground text-xs'>
                  Création de la séance, génération du code, enregistrement des absences par défaut, ouverture de la vue active.
                </p>
              </div>
              <Button
                disabled={!hasAssignedModules || isActive || !selectedModule}
                onClick={async () => {
                  if (!selectedModule) return;
                  try {
                    await startSession({
                      moduleId: selectedModule.module_id,
                      moduleCode: selectedModule.module_code,
                      moduleName: selectedModule.module_name,
                      room,
                      durationMinutes: durationInput,
                    });
                    router.push('/dashboard/active-session');
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Erreur lors du démarrage de la séance'
                    );
                  }
                }}
              >
                Démarrer la séance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
