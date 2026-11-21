import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';

export async function saveWithPhoto(uploadsDir, file, bytes, saveRecord) {
  await mkdir(uploadsDir, { recursive: true });
  const target = path.join(uploadsDir, file);
  const handle = await open(target, 'wx');
  try {
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
    return await saveRecord();
  } catch (error) {
    await unlink(target);
    throw error;
  }
}
