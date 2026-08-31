/** Local, in-page reminders. No push server, nothing leaves the phone. */
const timers = new Map<string, number>();

export const notificationState = (): NotificationPermission | 'unsupported' =>
  'Notification' in window ? Notification.permission : 'unsupported';

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export function scheduleReminder(id: string, at: number, title: string, body: string): void {
  cancelReminder(id);
  const delay = at - Date.now();
  if (delay <= 0 || delay > 6 * 3600_000) return;
  const handle = window.setTimeout(async () => {
    timers.delete(id);
    if (notificationState() !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    const options: NotificationOptions = { body, tag: id, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` };
    if (reg) reg.showNotification(title, options);
    else new Notification(title, options);
  }, delay);
  timers.set(id, handle);
}

export function cancelReminder(id: string): void {
  const handle = timers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    timers.delete(id);
  }
}
