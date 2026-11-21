import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Bi } from '../../components/Bi.tsx';
import { Button } from '../../components/Button.tsx';
import { ApiError, clearSession, getDirectory, getPending, readSession, type Directory, type Entry, type Operator, type Session } from './api.ts';
import { Desk } from './Desk.tsx';
import { t } from './i18n.ts';
import { Shell } from './Shell.tsx';
import { SignIn } from './SignIn.tsx';

interface Signed {
  session: Session;
  operator: Operator;
  pending: Entry[] | null;
}

/**
 * /operator: the party that received the waste confirms the handover on their own phone.
 * /operator?entry=<entryId> is the crew's QR link; after sign-in it opens that handover.
 */
export default function OperatorPage() {
  const [params, setParams] = useSearchParams();
  const entryId = params.get('entry');
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [directoryAttempt, setDirectoryAttempt] = useState(0);
  const [signed, setSigned] = useState<Signed | null>(null);
  const [resume, setResume] = useState<'checking' | 'failed' | 'done'>(() => (readSession() ? 'checking' : 'done'));
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setDirectoryFailed(false);
    getDirectory(controller.signal).then(setDirectory, () => !controller.signal.aborted && setDirectoryFailed(true));
    return () => controller.abort();
  }, [directoryAttempt]);

  // A stored sign-in from earlier in this tab: check the code still works.
  useEffect(() => {
    const session = readSession();
    if (!session) return;
    const controller = new AbortController();
    setResume('checking');
    getPending(session, controller.signal).then(
      ({ operator, pending }) => {
        setSigned({ session, operator, pending });
        setResume('done');
      },
      (err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          clearSession();
          setExpired(true);
          setResume('done');
        } else {
          setResume('failed');
        }
      },
    );
    return () => controller.abort();
  }, [resumeAttempt]);

  const signOut = useCallback((wasExpired: boolean) => {
    clearSession();
    setSigned(null);
    setExpired(wasExpired);
  }, []);

  const entryHandled = useCallback(() => setParams({}, { replace: true }), [setParams]);

  if (resume === 'checking') {
    return (
      <div className="grid h-dvh place-items-center bg-teak-deep">
        <span className="size-8 animate-spin rounded-full border-2 border-gold border-r-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (resume === 'failed' && !signed) {
    return (
      <Shell>
        <div role="alert" className="flex flex-col items-start gap-4 pt-6">
          <Bi as="p" text={t('loadFail')} className="text-lead" mlClassName="mt-1 text-body" />
          <Button onClick={() => setResumeAttempt((n) => n + 1)}>
            <Bi text={t('tryAgain')} className="leading-tight" mlClassName="mt-0.5 font-medium text-teak/75" />
          </Button>
        </div>
      </Shell>
    );
  }

  if (!signed) {
    return (
      <SignIn
        directory={directory}
        directoryFailed={directoryFailed}
        retryDirectory={() => setDirectoryAttempt((n) => n + 1)}
        scanned={Boolean(entryId)}
        expired={expired}
        onSignedIn={(session, operator, pending) => {
          setExpired(false);
          setSigned({ session, operator, pending });
        }}
      />
    );
  }

  return (
    <Desk
      key={signed.session.id}
      session={signed.session}
      operator={signed.operator}
      directory={directory}
      initialPending={signed.pending}
      entryId={entryId}
      onEntryHandled={entryHandled}
      onSignOut={signOut}
    />
  );
}
