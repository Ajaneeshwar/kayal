export function publicOrigin(publicUrl?: string | null): string {
  return publicUrl ?? window.location.origin;
}
