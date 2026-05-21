// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// File System Access API (Chromium-based browsers)
	interface FileSystemDirectoryHandle {
		values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
		getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
		getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
	}

	interface Window {
		showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
	}
}

export {};
