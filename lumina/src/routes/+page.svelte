<script lang="ts">
  import Titlebar from '$lib/components/layout/Titlebar.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import PlayerBar from '$lib/components/layout/PlayerBar.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ambientEnabled, currentView, sidebarCollapsed, searchQuery, activePlaylistId, miniPlayerMode, settingsOpen, lastWindowSize, queuePanelOpen, showCreatePlaylist, navigateTo } from '$lib/stores/ui';
  import { albums, artists, libraryLoading, scanProgress, trackCount, tracks as allTracks, visibleTracks, folderPermissionState } from '$lib/stores/library';
  import TrackList from '$lib/components/library/TrackList.svelte';
  import AlbumGrid from '$lib/components/library/AlbumGrid.svelte';
  import ArtistGrid from '$lib/components/library/ArtistGrid.svelte';
  import PlaylistGrid from '$lib/components/library/PlaylistGrid.svelte';
  import { playlists, selectedPlaylist, playlistTracks, selectPlaylist, refreshPlaylists } from '$lib/stores/playlists';
  import { scanDirectory, deletePlaylist, insertTrack, addTrackToPlaylist, createPlaylist, updatePlaylistInfo } from '$lib/commands/library';
  import SettingsModal from '$lib/components/overlays/SettingsModal.svelte';
  import NowPlaying from '$lib/components/overlays/NowPlaying.svelte';
  import QueuePanel from '$lib/components/overlays/QueuePanel.svelte';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { addMusicFolderWithDialog, initLibraryListeners, refreshTracks, checkFolderPermission, requestFolderPermission, ensureFolderPermissionAtClick } from '$lib/controllers/library';
  import { playQueueIndex, setQueue, togglePlayPause, playNext, playPrevious, stopPlayback, queueState, addToQueueNext } from '$lib/stores/queue';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import type { Track, MenuItem } from '$lib/types';
  import { currentTrack, isPlaying, volume, formatTime } from '$lib/stores/player';
  import { getArtworkUrl } from '$lib/utils/artwork';
  import { youtubeApiKeyStore, hasValidApiKey } from '$lib/stores/api';

  // Reactive sidebar width for grid
  let gridColumns = $derived(
    $sidebarCollapsed
      ? 'var(--sidebar-collapsed-width) 1fr'
      : 'var(--sidebar-width) 1fr'
  );

  onMount(async () => {
    try {
      initLibraryListeners();
    } catch (e) {
      console.error('Failed to init library listeners:', e);
    }

    try {
      await checkFolderPermission();
    } catch (e) {
      console.error('Failed to check folder permission:', e);
    }

    // Use allSettled so one failure doesn't block the other
    const results = await Promise.allSettled([
      refreshTracks(),
      refreshPlaylists()
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('App initialization partial failure:', result.reason);
      }
    }
  });

  async function handleAddMusic() {
    try {
      const folderName = await addMusicFolderWithDialog();
      if (folderName) {
        await checkFolderPermission();
      }
    } catch {
      libraryLoading.set(false);
    }
  }

  async function handlePlayFromList(track: Track, index: number) {
    if (track && !track.file_path.startsWith('youtube:')) {
      const ok = await ensureFolderPermissionAtClick();
      if (!ok) return; // user denied permission
    }
    setQueue($visibleTracks, index);
    await playQueueIndex(index);
  }

  async function handlePlayFromCustomList(list: Track[], index: number) {
    if (list.length === 0) return;
    const track = list[index];
    if (track && !track.file_path.startsWith('youtube:')) {
      const ok = await ensureFolderPermissionAtClick();
      if (!ok) return; // user denied permission
    }
    setQueue(list, index);
    await playQueueIndex(index);
  }

  let visibleFavorites = $derived($visibleTracks.filter((t) => t.favorite));

  let miniArtworkUrl = $state('');

  $effect(() => {
    const art = $currentTrack?.artwork_path;
    if (!art) { miniArtworkUrl = ''; return; }
    getArtworkUrl(art).then(url => { miniArtworkUrl = url; }).catch(() => { miniArtworkUrl = ''; });
  });

  let wasMiniMode = $state(false);

  $effect(() => {
    if ($miniPlayerMode && !wasMiniMode) {
      void enterMiniPlayer();
      queuePanelOpen.set(false);
    }
    wasMiniMode = $miniPlayerMode;
  });

  // ── Drag-and-drop & Floating State for Mini Player ──
  let miniX = $state(20);
  let miniY = $state(20);
  let isDragging = $state(false);

  onMount(() => {
    // Initial position in bottom-right corner
    miniX = window.innerWidth - 320 - 24;
    miniY = window.innerHeight - 72 - 24;
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  function handleResize() {
    if (miniX > window.innerWidth - 320) {
      miniX = Math.max(0, window.innerWidth - 320 - 24);
    }
    if (miniY > window.innerHeight - 72) {
      miniY = Math.max(0, window.innerHeight - 72 - 24);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, links, or standard control regions
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    isDragging = true;
    const startX = e.clientX - miniX;
    const startY = e.clientY - miniY;

    function handleMouseMove(moveEvent: MouseEvent) {
      miniX = Math.max(0, Math.min(window.innerWidth - 320, moveEvent.clientX - startX));
      miniY = Math.max(0, Math.min(window.innerHeight - 72, moveEvent.clientY - startY));
    }

    function handleMouseUp() {
      isDragging = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  async function handleRequestFolderPermission() {
    try {
      const granted = await requestFolderPermission();
      if (granted) {
        await refreshTracks();
      }
    } catch (e) {
      console.error('[lumina] Failed to request folder permission:', e);
    }
  }

  async function enterMiniPlayer() {
    miniPlayerMode.set(true);
    // Center-ish bottom right corner positioning on entrance
    miniX = window.innerWidth - 320 - 24;
    miniY = window.innerHeight - 72 - 24;
  }

  async function exitMiniPlayer() {
    miniPlayerMode.set(false);
  }

  async function handlePlayPlaylist(list: Track[], index: number) {
    await handlePlayFromCustomList(list, index);
  }

  async function handleDeleteCurrentPlaylist() {
    const pl = $selectedPlaylist;
    if (!pl) return;
    try {
      await deletePlaylist(pl.id);
      selectPlaylist(null);
      await refreshPlaylists();
    } catch (e) {
      console.error('Failed to delete playlist', e);
    }
  }

  async function handleSelectPlaylist(pl: import('$lib/types').Playlist) {
    selectPlaylist(pl);
  }

  let recentTracks = $derived(
    (() => {
      const q = $searchQuery.trim().toLowerCase();
      let list = $allTracks.filter((t) => !!t.last_played);
      if (q) {
        list = list.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.album_artist ?? ''} ${t.genre ?? ''}`.toLowerCase().includes(q));
      }
      return [...list].sort((a, b) => (b.last_played || '').localeCompare(a.last_played || ''));
    })()
  );

  // ── YT Context Menu ──
  let ytCtx = $state<{ x: number; y: number; track: Track; index: number } | null>(null);

  function openYtCtx(e: MouseEvent, track: Track, index: number) {
    e.stopPropagation();
    ytCtx = { x: e.clientX, y: e.clientY, track, index };
  }

  function closeYtCtx() {
    ytCtx = null;
  }

  function addToQueueEnd(track: Track) {
    queueState.update(qs => ({
      ...qs,
      tracks: [...qs.tracks, track]
    }));
  }

  function getYtMenuItems(track: Track, index: number): MenuItem[] {
    return [
      {
        id: 'play-next', label: 'Play Next', icon: 'skip-forward',
        onclick: () => { addToQueueNext(track); }
      },
      {
        id: 'add-queue', label: 'Add to Queue', icon: 'queue',
        onclick: () => { addToQueueEnd(track); }
      },
      { id: 'divider1', divider: true },
      {
        id: 'add-playlist', label: 'Add to Playlist', icon: 'plus',
        children: [
          ...get(playlists).map(pl => ({
            id: `pl-${pl.id}`, label: pl.name, icon: 'list' as const,
            onclick: async () => {
              try {
                await insertTrack(track);
                await addTrackToPlaylist(pl.id, track.id);
              } catch (err) {
                console.error('[lumina] Failed to save track:', err);
              }
            }
          })),
          { id: 'divider-pl', divider: true },
          {
            id: 'new-playlist', label: 'New Playlist…', icon: 'plus' as const,
            onclick: () => { openSavePicker(track); }
          }
        ]
      }
    ];
  }

  // ── YouTube Search & Playback State ──
  let ytSearchQuery = $state('');
  let ytLoading = $state(false);
  let ytResults = $state<Track[]>([]);
  let ytError = $state('');
  let inputApiKey = $state('');

  $effect(() => {
    inputApiKey = $youtubeApiKeyStore;
  });

  function saveApiKey() {
    if (inputApiKey.trim()) {
      youtubeApiKeyStore.set(inputApiKey.trim());
    }
  }

  async function performYoutubeSearch() {
    if (!ytSearchQuery.trim()) return;
    const apiKey = $youtubeApiKeyStore;
    if (!hasValidApiKey(apiKey)) {
      ytError = 'API Key is not configured. Please add your key below or in Settings.';
      return;
    }

    ytLoading = true;
    ytError = '';
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(ytSearchQuery)}&type=video&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'YouTube API search failed');
      }

      const items: any[] = data.items || [];
      const videoIds = items.map((item: any) => item.id.videoId).filter(Boolean).join(',');

      // Fetch durations from the videos endpoint
      let durationMap: Record<string, number> = {};
      if (videoIds) {
        try {
          const durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
          const durRes = await fetch(durUrl);
          const durData = await durRes.json();
          if (!durData.error) {
            for (const v of (durData.items || [])) {
              durationMap[v.id] = parseIsoDuration(v.contentDetails.duration);
            }
          }
        } catch {
          // durations are non-critical
        }
      }

      ytResults = items.map((item: any) => {
        const videoId = item.id.videoId;
        return {
          id: 'yt-' + videoId,
          title: decodeHtmlEntities(item.snippet.title),
          artist: decodeHtmlEntities(item.snippet.channelTitle),
          album: 'YouTube Single',
          album_artist: 'YouTube',
          genre: 'YouTube',
          year: null,
          track_number: null,
          disc_number: null,
          duration: durationMap[videoId] || 0,
          file_path: 'youtube:' + videoId,
          file_format: 'youtube',
          file_size: 0,
          bitrate: null,
          sample_rate: null,
          composer: null,
          publisher: null,
          comments: null,
          artwork_path: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
          date_added: new Date().toISOString(),
          last_played: null,
          play_count: 0,
          favorite: false
        };
      });
    } catch (e: any) {
      console.error('[lumina-youtube] Search failed:', e);
      ytError = e.message || 'Search failed. Please check your API key or connection.';
      ytResults = [];
    } finally {
      ytLoading = false;
    }
  }

  function decodeHtmlEntities(str: string): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function parseIsoDuration(duration: string): number {
    const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1] || '0', 10) * 3600 +
            parseInt(m[2] || '0', 10) * 60 +
            parseInt(m[3] || '0', 10));
  }

  // ── Save YouTube Track to Library + Playlist ──
  let saveTargetTrack = $state<Track | null>(null);
  let savePickerVisible = $state(false);
  let newPlaylistName = $state('');

  function openSavePicker(track: Track) {
    saveTargetTrack = track;
    newPlaylistName = '';
    savePickerVisible = true;
  }

  function closeSavePicker() {
    savePickerVisible = false;
    saveTargetTrack = null;
    newPlaylistName = '';
  }

  async function saveToPlaylist(playlistId: string) {
    const track = saveTargetTrack;
    if (!track) return;
    try {
      await insertTrack(track);
      await addTrackToPlaylist(playlistId, track.id);
      closeSavePicker();
    } catch (e) {
      console.error('[lumina] Failed to save track:', e);
    }
  }

  async function createAndSaveToNewPlaylist() {
    const track = saveTargetTrack;
    if (!track || !newPlaylistName.trim()) return;
    try {
      await insertTrack(track);
      const pl = await createPlaylist(newPlaylistName.trim());
      await addTrackToPlaylist(pl.id, track.id);
      await refreshPlaylists();
      closeSavePicker();
    } catch (e) {
      console.error('[lumina] Failed to create playlist and save track:', e);
    }
  }

  // ── Edit Playlist Info ──
  let editPlaylistOpen = $state(false);
  let editPlaylistName = $state('');
  let editPlaylistDesc = $state('');
  let editPlaylistArtwork = $state('');

  function openEditPlaylist() {
    const pl = $selectedPlaylist;
    if (!pl) return;
    editPlaylistName = pl.name;
    editPlaylistDesc = pl.description;
    editPlaylistArtwork = pl.artwork_path ?? '';
    editPlaylistOpen = true;
  }

  function closeEditPlaylist() {
    editPlaylistOpen = false;
  }

  function selectPlaylistImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          editPlaylistArtwork = reader.result;
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function saveEditPlaylist() {
    const pl = $selectedPlaylist;
    if (!pl || !editPlaylistName.trim()) return;
    try {
      await updatePlaylistInfo(pl.id, {
        name: editPlaylistName.trim(),
        description: editPlaylistDesc,
        artwork_path: editPlaylistArtwork || null,
      });
      await refreshPlaylists();
      closeEditPlaylist();
    } catch (e) {
      console.error('[lumina] Failed to update playlist:', e);
    }
  }

  // ── Create Playlist Modal ──
  let createName = $state('');
  let createDesc = $state('');
  let createArtwork = $state('');

  function openCreateModal() {
    createName = '';
    createDesc = '';
    createArtwork = '';
    showCreatePlaylist.set(true);
  }

  function closeCreateModal() {
    showCreatePlaylist.set(false);
  }

  function selectCreateImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png, image/jpeg, image/webp';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          createArtwork = reader.result;
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function handleCreateSubmit() {
    if (!createName.trim()) return;
    try {
      const pl = await createPlaylist(createName.trim(), createDesc);
      if (createArtwork) {
        await updatePlaylistInfo(pl.id, { artwork_path: createArtwork });
      }
      await refreshPlaylists();
      selectPlaylist(pl);
      navigateTo('playlists');
      closeCreateModal();
    } catch (e) {
      console.error('[lumina] Failed to create playlist:', e);
    }
  }

  // ── Add Songs to Playlist Panel ──
  let addSongsOpen = $state(false);
  let addSongsQuery = $state('');
  let addSongsYtResults = $state<Track[]>([]);
  let addSongsYtLoading = $state(false);
  let addSongsYtError = $state('');

  let selectedAddTrackIds = $state<Set<string>>(new Set());

  function toggleAddTrackSelection(trackId: string) {
    const next = new Set(selectedAddTrackIds);
    if (next.has(trackId)) next.delete(trackId); else next.add(trackId);
    selectedAddTrackIds = next;
  }

  function openAddSongs() {
    addSongsOpen = true;
    addSongsQuery = '';
    addSongsYtResults = [];
    addSongsYtError = '';
    selectedAddTrackIds = new Set();
  }

  function closeAddSongs() {
    addSongsOpen = false;
  }

  let addSongsLibResults = $derived(
    addSongsQuery
      ? $allTracks.filter(t =>
          t.title.toLowerCase().includes(addSongsQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(addSongsQuery.toLowerCase()) ||
          t.album.toLowerCase().includes(addSongsQuery.toLowerCase())
        )
      : []
  );

  async function addSongsSearchYoutube() {
    if (!addSongsQuery.trim()) return;
    const apiKey = $youtubeApiKeyStore;
    if (!hasValidApiKey(apiKey)) {
      addSongsYtError = 'YouTube API key not configured.';
      return;
    }
    addSongsYtLoading = true;
    addSongsYtError = '';
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(addSongsQuery)}&type=video&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Search failed');
      const items: any[] = data.items || [];
      const videoIds = items.map((item: any) => item.id.videoId).filter(Boolean).join(',');
      let durationMap: Record<string, number> = {};
      if (videoIds) {
        try {
          const durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`;
          const durRes = await fetch(durUrl);
          const durData = await durRes.json();
          if (!durData.error) {
            for (const v of (durData.items || [])) durationMap[v.id] = parseIsoDuration(v.contentDetails.duration);
          }
        } catch { /* non-critical */ }
      }
      addSongsYtResults = items.map((item: any) => {
        const videoId = item.id.videoId;
        return {
          id: 'yt-' + videoId,
          title: decodeHtmlEntities(item.snippet.title),
          artist: decodeHtmlEntities(item.snippet.channelTitle),
          album: 'YouTube Single',
          album_artist: 'YouTube',
          genre: 'YouTube',
          year: null,
          track_number: null,
          disc_number: null,
          duration: durationMap[videoId] || 0,
          file_path: 'youtube:' + videoId,
          file_format: 'youtube',
          file_size: 0,
          bitrate: null,
          sample_rate: null,
          composer: null,
          publisher: null,
          comments: null,
          artwork_path: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
          date_added: new Date().toISOString(),
          last_played: null,
          play_count: 0,
          favorite: false
        };
      });
    } catch (e: any) {
      addSongsYtError = e.message || 'Search failed.';
      addSongsYtResults = [];
    } finally {
      addSongsYtLoading = false;
    }
  }

  let allTracksForSelection = $derived(() => {
    const map = new Map<string, Track>();
    for (const t of $allTracks) map.set(t.id, t);
    for (const t of addSongsYtResults) map.set(t.id, t);
    return map;
  });

  async function addSelectedTracksToPlaylist() {
    const pl = $selectedPlaylist;
    if (!pl || selectedAddTrackIds.size === 0) return;
    const map = allTracksForSelection();
    try {
      for (const id of selectedAddTrackIds) {
        const track = map.get(id);
        if (!track) continue;
        await insertTrack(track);
        await addTrackToPlaylist(pl.id, track.id);
      }
      await refreshPlaylists();
      selectedAddTrackIds = new Set();
    } catch (e) {
      console.error('[lumina] Failed to add tracks to playlist:', e);
    }
  }
</script>

{#if $miniPlayerMode}
  <!-- Premium Glassmorphic Draggable Floating Mini Player -->
  <div class="mini-player-overlay">
    {#if miniArtworkUrl}
      <div class="mini-player-backdrop-art" style="background-image: url({miniArtworkUrl})"></div>
    {/if}
    <div class="mini-player-backdrop-dim"></div>

    <div 
      class="mini-player-floating" 
      style="left: {miniX}px; top: {miniY}px;" 
      onmousedown={handleMouseDown}
      role="presentation"
    >
      <div class="mini-drag-handle">
        <Icon name="grid" size={10} color="rgba(255,255,255,0.4)" />
      </div>

      <div class="mini-art">
        {#if miniArtworkUrl}
          <img src={miniArtworkUrl} alt="" />
        {:else}
          <div class="mini-art-placeholder">
            <Icon name="music" size={20} color="rgba(255,255,255,0.4)" />
          </div>
        {/if}
      </div>
      <div class="mini-body">
        <div class="mini-info">
          {#if $currentTrack}
            <div class="mini-title truncate">{$currentTrack.title}</div>
            <div class="mini-artist truncate">{$currentTrack.artist}</div>
          {:else}
            <div class="mini-title" style="opacity:0.5">No track</div>
          {/if}
        </div>
        <div class="mini-controls">
          <button class="mini-btn" onclick={() => void playPrevious()} title="Previous">
            <Icon name="skip-back" size={13} />
          </button>
          <button class="mini-play-btn" onclick={() => void togglePlayPause()} title={$isPlaying ? 'Pause' : 'Play'}>
            <Icon name={$isPlaying ? 'pause' : 'play'} size={15} />
          </button>
          <button class="mini-btn" onclick={() => void playNext()} title="Next">
            <Icon name="skip-forward" size={13} />
          </button>
        </div>
      </div>
      <button class="mini-close" onclick={exitMiniPlayer} title="Exit mini player (restore window)">
        <Icon name="x" size={11} />
      </button>
    </div>
  </div>
{:else}
<div class="app-container">
  <!-- Sidebar -->
  <div class="app-sidebar">
    <Sidebar />
  </div>

  <!-- Right side: Titlebar + Content + Player -->
  <div class="app-main">
    <!-- Titlebar -->
    <div class="app-titlebar">
      <Titlebar />
    </div>

    <!-- Main Content Area -->
    <main class="app-content">
      <div class="content-inner">
        {#if $folderPermissionState === 'stored_needs_permission'}
          <div class="permission-banner">
            <div class="permission-banner-content">
              <Icon name="alert-triangle" size={18} color="#ef4444" />
              <span>Lumina needs permission to access your local music library.</span>
            </div>
            <button class="permission-btn" onclick={handleRequestFolderPermission}>
              Grant Access
            </button>
          </div>
        {/if}

        {#if $currentView === 'tracks'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">All Tracks</h1>
              <span class="view-count">{$trackCount}</span>
            </div>
            <button class="add-btn" onclick={handleAddMusic}>
              <Icon name="plus" size={14} />
              <span>Add Music</span>
            </button>
          </div>

          {#if $libraryLoading && $scanProgress}
            <div class="scan-status">
              <span class="scan-text">Scanning… {$scanProgress.scanned}/{$scanProgress.total}</span>
              <div class="scan-bar">
                <div class="scan-bar-fill" style="width: {$scanProgress.total > 0 ? ($scanProgress.scanned / $scanProgress.total) * 100 : 0}%"></div>
              </div>
            </div>
          {/if}

          <div class="tracks-list-container">
            <TrackList tracks={$visibleTracks} onPlay={handlePlayFromList} />
          </div>

        {:else if $currentView === 'albums'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Albums</h1>
              <span class="view-count">{$albums.length}</span>
            </div>
          </div>
          <AlbumGrid
            albums={$albums}
            tracks={$allTracks}
            onPlayAlbum={(list) => void handlePlayFromCustomList(list, 0)}
          />

        {:else if $currentView === 'artists'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Artists</h1>
              <span class="view-count">{$artists.length}</span>
            </div>
          </div>
          <ArtistGrid
            artists={$artists}
            tracks={$allTracks}
            onPlayArtist={(list) => void handlePlayFromCustomList(list, 0)}
          />

        {:else if $currentView === 'playlists'}
          {#if $selectedPlaylist}
            <div class="pl-header">
              <button class="back-btn" onclick={() => selectPlaylist(null)}>
                <Icon name="chevron-left" size={16} />
              </button>
              <div class="pl-cover-row">
                <div class="pl-cover">
                  {#if $selectedPlaylist.artwork_path}
                    <img src={$selectedPlaylist.artwork_path} alt="" />
                  {:else}
                    <div class="pl-cover-placeholder">
                      <Icon name="list" size={48} color="var(--accent-primary)" />
                    </div>
                  {/if}
                </div>
                <div class="pl-info">
                  <h1 class="pl-name">{$selectedPlaylist.name}</h1>
                  {#if $selectedPlaylist.description}
                    <p class="pl-description">{$selectedPlaylist.description}</p>
                  {/if}
                  <span class="pl-count">{$playlistTracks.length} tracks</span>
                  <div class="pl-actions">
                    <button class="add-btn" onclick={openAddSongs}>
                      <Icon name="plus" size={14} />
                      <span>Add Songs</span>
                    </button>
                    <button class="add-btn" onclick={openEditPlaylist}>
                      <Icon name="edit" size={14} />
                      <span>Edit Info</span>
                    </button>
                    <button class="add-btn danger" onclick={handleDeleteCurrentPlaylist}>
                      <Icon name="x" size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {#if $playlistTracks.length === 0}
              <p class="empty-text">This playlist is empty.</p>
            {:else}
              <div class="tracks-list-container">
                <TrackList
                  tracks={$playlistTracks}
                  playlistId={$selectedPlaylist?.id}
                  onPlay={(t: Track, i: number) => void handlePlayPlaylist($playlistTracks, i)}
                />
              </div>
            {/if}
          {:else}
            <div class="view-header">
              <div class="view-title-row">
                <h1 class="view-title">Playlists</h1>
                <span class="view-count">{$playlists.length}</span>
              </div>
            </div>
            {#if $playlists.length === 0}
              <p class="empty-text">No playlists yet.</p>
            {:else}
              <PlaylistGrid playlists={$playlists} onSelect={handleSelectPlaylist} />
            {/if}
          {/if}

        {:else if $currentView === 'favorites'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Favorites</h1>
              <span class="view-count">{visibleFavorites.length}</span>
            </div>
          </div>
          {#if visibleFavorites.length === 0}
            <p class="empty-text">No favorites yet — right-click a track to add one.</p>
          {:else}
            <div class="tracks-list-container">
              <TrackList
                tracks={visibleFavorites}
                onPlay={(t: Track, i: number) => void handlePlayFromCustomList(visibleFavorites, i)}
              />
            </div>
          {/if}

        {:else if $currentView === 'recent'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">Recently Played</h1>
              <span class="view-count">{recentTracks.length}</span>
            </div>
          </div>
          {#if recentTracks.length === 0}
            <p class="empty-text">Play some tracks to see them here.</p>
          {:else}
            <div class="tracks-list-container">
              <TrackList
                tracks={recentTracks}
                onPlay={(t: Track, i: number) => void handlePlayFromCustomList(recentTracks, i)}
              />
            </div>
          {/if}
        {:else if $currentView === 'youtube'}
          <div class="view-header">
            <div class="view-title-row">
              <h1 class="view-title">YouTube Search</h1>
              <span class="view-count">{ytResults.length}</span>
            </div>
          </div>

          <div class="yt-search-container">
            <div class="yt-search-bar">
              <input
                type="text"
                class="yt-search-input"
                placeholder="Search YouTube for songs, artists, or channels…"
                bind:value={ytSearchQuery}
                onkeydown={(e) => { if (e.key === 'Enter') void performYoutubeSearch() }}
              />
              <button class="yt-search-btn" onclick={() => void performYoutubeSearch()} title="Search">
                <Icon name="search" size={16} />
              </button>
            </div>

            {#if ytError}
              <div class="yt-error-banner">
                {ytError}
              </div>
            {/if}

            {#if !hasValidApiKey($youtubeApiKeyStore)}
              <div class="yt-setup-card">
                <div class="yt-setup-glow"></div>
                <div class="yt-setup-title">YouTube API Key Setup</div>
                <p class="yt-setup-desc">
                  Provide your personal Google Cloud YouTube Data API v3 key below to search and stream tracks directly inside Lumina.
                </p>

                <div class="yt-input-group">
                  <input
                    type="password"
                    class="yt-key-input"
                    placeholder="Enter your secret YouTube API Key (AIzaSy...)"
                    bind:value={inputApiKey}
                    onkeydown={(e) => { if (e.key === 'Enter') saveApiKey() }}
                  />
                  <button class="yt-save-btn" onclick={saveApiKey} disabled={!inputApiKey.trim()}>
                    Save Key
                  </button>
                </div>

                <p class="yt-setup-subdesc">
                  Alternatively, you can save it inside <code>src/lib/config/api.ts</code> in your editor.
                </p>
                <div class="yt-setup-warning">
                  <Icon name="lock" size={13} color="rgba(255,255,255,0.4)" />
                  <span>The API key is completely masked, stored only locally in your browser, and never shared.</span>
                </div>
              </div>
            {:else if ytLoading}
              <p class="empty-text">Searching YouTube… Please wait.</p>
            {:else if ytResults.length === 0}
              <p class="empty-text">Type a search term above and press Enter to find music.</p>
            {:else}
              <div class="yt-results-grid">
                {#each ytResults as track, i}
                  <div class="yt-card" onclick={() => void handlePlayFromCustomList(ytResults, i)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') void handlePlayFromCustomList(ytResults, i) }}>
                    <div class="yt-thumb-wrapper">
                      {#if track.artwork_path}
                        <img src={track.artwork_path} class="yt-thumb" alt="" />
                      {/if}
                      <div class="yt-play-overlay">
                        <div class="yt-play-badge">
                          <Icon name="play" size={18} />
                        </div>
                      </div>
                      {#if track.duration > 0}
                        <span class="yt-duration-badge">{formatTime(track.duration)}</span>
                      {/if}
                    </div>
                    <div class="yt-card-info">
                      <div class="yt-card-title">{track.title}</div>
                      <div class="yt-card-artist">{track.artist}</div>
                    </div>
                    <button
                      class="yt-ctx-btn"
                      onclick={(e) => openYtCtx(e, track, i)}
                      title="More"
                    >
                      <Icon name="more-horizontal" size={16} />
                    </button>
                  </div>
                {/each}
              </div>

              {#if ytCtx}
                <ContextMenu
                  items={getYtMenuItems(ytCtx.track, ytCtx.index)}
                  x={ytCtx.x}
                  y={ytCtx.y}
                  onClose={closeYtCtx}
                />
              {/if}

            {/if}
          </div>
        {/if}
      </div>
    </main>

    <!-- Floating Player -->
    <div class="app-player">
      <PlayerBar />
    </div>
  </div>
</div>
{/if}

{#if savePickerVisible && saveTargetTrack}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="save-picker-backdrop" onclick={closeSavePicker} onkeydown={(e) => { if (e.key === 'Escape') closeSavePicker(); }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="save-picker" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="save-picker-header">
        <div class="save-picker-title">Save to Playlist</div>
        <button class="save-picker-close" onclick={closeSavePicker}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div class="save-picker-track">
        <Icon name="music" size={14} color="var(--text-tertiary)" />
        <span class="truncate">{saveTargetTrack.title}</span>
      </div>
      <div class="save-picker-list">
        {#each $playlists as pl}
          <button class="save-picker-item" onclick={() => void saveToPlaylist(pl.id)}>
            <Icon name="list" size={14} />
            <span class="truncate">{pl.name}</span>
            <span class="save-picker-count">{pl.track_count}</span>
          </button>
        {/each}
      </div>
      <div class="save-picker-divider"></div>
      <div class="save-picker-new-row">
        <input
          type="text"
          class="save-picker-input"
          placeholder="New playlist name..."
          bind:value={newPlaylistName}
          onkeydown={(e) => { if (e.key === 'Enter') void createAndSaveToNewPlaylist(); }}
        />
        <button class="save-picker-create" onclick={() => void createAndSaveToNewPlaylist()} disabled={!newPlaylistName.trim()}>
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

{#if editPlaylistOpen && $selectedPlaylist}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="save-picker-backdrop" onclick={closeEditPlaylist} onkeydown={(e) => { if (e.key === 'Escape') closeEditPlaylist(); }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="save-picker" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="save-picker-header">
        <div class="save-picker-title">Edit Playlist</div>
        <button class="save-picker-close" onclick={closeEditPlaylist}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div class="save-picker-new-row" style="margin-top:4px">
        <input
          type="text"
          class="save-picker-input"
          placeholder="Playlist name"
          bind:value={editPlaylistName}
          onkeydown={(e) => { if (e.key === 'Enter') void saveEditPlaylist(); }}
        />
      </div>
      <div class="save-picker-new-row">
        <input
          type="text"
          class="save-picker-input"
          placeholder="Description (optional)"
          bind:value={editPlaylistDesc}
          onkeydown={(e) => { if (e.key === 'Enter') void saveEditPlaylist(); }}
        />
      </div>
      <button class="pl-art-btn" onclick={selectPlaylistImage}>
        {#if editPlaylistArtwork}
          <span class="truncate">✓ Image selected</span>
        {:else}
          <span>Set Cover Image</span>
        {/if}
      </button>
      <div class="save-picker-divider"></div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="save-picker-create" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary)" onclick={closeEditPlaylist}>Cancel</button>
        <button class="save-picker-create" onclick={() => void saveEditPlaylist()} disabled={!editPlaylistName.trim()}>Save</button>
      </div>
    </div>
  </div>
{/if}

{#if $showCreatePlaylist}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="save-picker-backdrop" onclick={closeCreateModal} onkeydown={(e) => { if (e.key === 'Escape') closeCreateModal(); }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="save-picker" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="save-picker-header">
        <div class="save-picker-title">New Playlist</div>
        <button class="save-picker-close" onclick={closeCreateModal}>
          <Icon name="x" size={14} />
        </button>
      </div>
      <div class="save-picker-new-row" style="margin-top:4px">
        <input
          type="text"
          class="save-picker-input"
          placeholder="Playlist name"
          bind:value={createName}
          onkeydown={(e) => { if (e.key === 'Enter') void handleCreateSubmit(); }}
        />
      </div>
      <div class="save-picker-new-row">
        <input
          type="text"
          class="save-picker-input"
          placeholder="Description (optional)"
          bind:value={createDesc}
        />
      </div>
      <button class="pl-art-btn" onclick={selectCreateImage}>
        {#if createArtwork}
          <span class="truncate">✓ Image selected</span>
        {:else}
          <span>Set Cover Image</span>
        {/if}
      </button>
      <div class="save-picker-divider"></div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="save-picker-create" style="background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-secondary)" onclick={closeCreateModal}>Cancel</button>
        <button class="save-picker-create" onclick={() => void handleCreateSubmit()} disabled={!createName.trim()}>Create</button>
      </div>
    </div>
  </div>
{/if}

{#if addSongsOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="save-picker-backdrop" onclick={closeAddSongs} onkeydown={(e) => { if (e.key === 'Escape') closeAddSongs(); }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="save-picker add-songs-panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="save-picker-header">
        <div class="save-picker-title">Add Songs to Playlist</div>
        <button class="save-picker-close" onclick={closeAddSongs}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div class="add-songs-search-row">
        <div class="add-songs-search-bar">
          <Icon name="search" size={13} color="var(--text-tertiary)" />
          <input
            type="text"
            class="add-songs-search-input"
            placeholder="Search tracks &amp; YouTube…"
            bind:value={addSongsQuery}
            onkeydown={(e) => { if (e.key === 'Enter') void addSongsSearchYoutube(); }}
          />
          {#if addSongsQuery}
            <button class="add-songs-search-clear" onclick={() => { addSongsQuery = ''; addSongsYtResults = []; addSongsYtError = ''; }}>
              <Icon name="x" size={10} />
            </button>
          {/if}
          <button class="add-songs-yt-btn" onclick={() => void addSongsSearchYoutube()} disabled={addSongsYtLoading} title="Search YouTube">
            {addSongsYtLoading ? '…' : 'YT'}
          </button>
        </div>
      </div>

      <div class="add-songs-body">
        {#if addSongsLibResults.length > 0}
          <div class="add-songs-section-header">From Library</div>
          <div class="add-songs-tracklist">
            {#each addSongsLibResults as track}
              <div class="add-songs-track" onclick={() => toggleAddTrackSelection(track.id)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') toggleAddTrackSelection(track.id); }}>
                <span class="add-songs-check" class:checked={selectedAddTrackIds.has(track.id)}></span>
                <div class="add-songs-track-info">
                  <span class="truncate">{track.title}</span>
                  <span class="add-songs-track-artist truncate">{track.artist}</span>
                </div>
                {#if track.duration > 0}
                  <span class="add-songs-duration">{formatTime(track.duration)}</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else if addSongsQuery && !addSongsYtLoading && addSongsYtResults.length === 0 && !addSongsYtError}
          <p class="add-songs-empty">No matching tracks in your library.</p>
        {/if}

        {#if addSongsYtError}
          <p class="add-songs-yt-error">{addSongsYtError}</p>
        {/if}

        {#if addSongsYtResults.length > 0}
          {#if addSongsLibResults.length > 0}<div class="save-picker-divider" style="margin:6px 0"></div>{/if}
          <div class="add-songs-section-header">YouTube Results</div>
          <div class="add-songs-tracklist">
            {#each addSongsYtResults as track}
              <div class="add-songs-track" onclick={() => toggleAddTrackSelection(track.id)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') toggleAddTrackSelection(track.id); }}>
                <span class="add-songs-check" class:checked={selectedAddTrackIds.has(track.id)}></span>
                <div class="add-songs-track-info">
                  <span class="truncate">{track.title}</span>
                  <span class="add-songs-track-artist truncate">{track.artist}</span>
                </div>
                {#if track.duration > 0}
                  <span class="add-songs-duration">{formatTime(track.duration)}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="save-picker-divider" style="margin:8px 0"></div>
      <div class="add-songs-bottom">
        <span class="add-songs-selected-count">{selectedAddTrackIds.size} selected</span>
        <button class="save-picker-create" onclick={() => void addSelectedTracksToPlaylist()} disabled={selectedAddTrackIds.size === 0}>
          Add Selected
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Overlays -->
<SettingsModal />
<NowPlaying />
<QueuePanel />

<style>
  /* === App Main (right side column) === */
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .app-titlebar { flex-shrink: 0; }

  .app-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .content-inner {
    padding: 32px 40px 140px 40px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
  }

  .view-title-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .view-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.03em;
    margin: 0;
  }

  .view-count {
    font-size: 13px;
    color: var(--text-tertiary);
    font-weight: 400;
  }

  /* ====== Playlist Header with Cover ====== */
  .pl-header {
    margin-bottom: 32px;
  }

  .pl-header .back-btn {
    margin-bottom: 16px;
  }

  .pl-cover-row {
    display: flex;
    gap: 28px;
    align-items: flex-start;
  }

  .pl-cover {
    width: 200px;
    height: 200px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--accent-gradient-subtle);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  }

  .pl-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    image-rendering: auto;
  }

  .pl-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pl-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 12px;
    min-width: 0;
  }

  .pl-name {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.03em;
    margin: 0;
  }

  .pl-description {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  .pl-count {
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .pl-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }



  .add-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-elevated);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .add-btn:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text-primary);
  }

  .add-btn.danger:hover {
    background: rgba(220,38,38,0.15);
    color: #ef4444;
  }

  .scan-status {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .scan-text {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .scan-bar {
    flex: 1;
    height: 4px;
    background: var(--bg-elevated);
    border-radius: 2px;
    overflow: hidden;
    max-width: 300px;
  }

  .scan-bar-fill {
    height: 100%;
    background: var(--text-primary);
    transition: width 0.3s ease;
  }

  .tracks-list-container {
    flex: 1;
    min-height: 0;
  }

  .empty-text {
    color: var(--text-tertiary);
    font-size: 14px;
    padding: 40px 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .back-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  /* ====== Compact Mini Player ====== */
  .mini-player-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .mini-player-backdrop-art {
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    background-size: cover;
    background-position: center;
    filter: blur(40px) brightness(0.25);
    z-index: 1;
    pointer-events: none;
    transition: background-image 0.5s ease;
  }

  .mini-player-backdrop-dim {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%);
    z-index: 2;
    pointer-events: none;
  }

  .mini-player-floating {
    position: absolute;
    width: 320px;
    height: 72px;
    display: flex;
    align-items: center;
    background: rgba(20, 20, 20, 0.45);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0 12px;
    gap: 10px;
    z-index: 3;
    cursor: grab;
    pointer-events: auto;
    user-select: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .mini-player-floating:active {
    cursor: grabbing;
    border-color: rgba(255, 255, 255, 0.16);
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .mini-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    padding-right: 2px;
    opacity: 0.3;
    transition: opacity 0.2s;
  }

  .mini-player-floating:hover .mini-drag-handle {
    opacity: 0.7;
  }

  .mini-art {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--bg-primary);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .mini-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .mini-art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }

  .mini-body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .mini-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .mini-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .mini-artist {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .mini-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .mini-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .mini-btn:hover {
    color: var(--text-primary);
    background: rgba(255,255,255,0.08);
  }

  .mini-play-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--text-primary);
    color: var(--bg-primary);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mini-play-btn:hover {
    transform: scale(1.08);
  }

  .mini-close {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-tertiary);
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .mini-close:hover {
    background: rgba(255,255,255,0.08);
    color: var(--text-primary);
  }

  /* ====== Permission Banner ====== */
  .permission-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    margin-bottom: 24px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
    animation: slideDown 0.3s ease;
  }

  .permission-banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .permission-btn {
    padding: 6px 14px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .permission-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ffffff;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  }

  /* ====== YouTube Search View ====== */
  .yt-search-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
  }

  .yt-search-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
    max-width: 600px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 6px 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .yt-search-bar:focus-within {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 24px rgba(255, 255, 255, 0.05);
  }

  .yt-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 14px;
    padding: 8px 0;
  }

  .yt-search-input::placeholder {
    color: var(--text-tertiary);
  }

  .yt-search-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: all 0.15s ease;
  }

  .yt-search-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .yt-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    margin-top: 16px;
  }

  .yt-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .yt-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
  }

  .yt-thumb-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .yt-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .yt-card:hover .yt-thumb {
    transform: scale(1.05);
  }

  .yt-duration-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    padding: 2px 6px;
    background: rgba(0,0,0,0.75);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    font-variant-numeric: tabular-nums;
    z-index: 1;
    pointer-events: none;
  }

  .yt-play-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .yt-card:hover .yt-play-overlay {
    opacity: 1;
  }

  .yt-play-badge {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--text-primary);
    color: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transform: scale(0.9);
    transition: transform 0.2s ease;
  }

  .yt-card:hover .yt-play-badge {
    transform: scale(1);
  }

  .yt-card-info {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .yt-card-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .yt-card-artist {
    font-size: 11px;
    color: var(--text-secondary);
  }

  /* ====== Setup Card ====== */
  .yt-setup-card {
    position: relative;
    padding: 32px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.3);
  }

  .yt-setup-glow {
    position: absolute;
    top: -100px;
    right: -100px;
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .yt-setup-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .yt-setup-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .yt-input-group {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
  }

  .yt-key-input {
    flex: 1;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
    transition: all 0.2s ease;
  }

  .yt-key-input:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(239, 68, 68, 0.35);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
  }

  .yt-save-btn {
    padding: 10px 20px;
    background: #ef4444;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .yt-save-btn:hover:not(:disabled) {
    background: #f87171;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }

  .yt-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .yt-setup-subdesc {
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 4px 0 0 0;
  }

  .yt-setup-subdesc code {
    background: rgba(255, 255, 255, 0.06);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    color: #ef4444;
  }

  .yt-setup-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }

  .yt-error-banner {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 13px;
    width: 100%;
    max-width: 600px;
  }

  /* ====== YT 3-dot Button ====== */
  .yt-ctx-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s ease;
    z-index: 2;
  }

  .yt-card:hover .yt-ctx-btn {
    opacity: 1;
  }

  .yt-ctx-btn:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }

  /* ====== Save to Playlist Picker ====== */
  .save-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(6px);
    animation: fadeIn 0.2s ease;
  }

  .save-picker {
    width: 340px;
    max-height: 400px;
    background: rgba(20,20,20,0.96);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 20px 48px rgba(0,0,0,0.6);
    animation: fadeInScale 0.2s var(--ease-out-expo);
  }

  .save-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .save-picker-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .save-picker-close {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
  }

  .save-picker-close:hover {
    background: rgba(255,255,255,0.08);
    color: var(--text-primary);
  }

  .save-picker-track {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .save-picker-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 200px;
    overflow-y: auto;
  }

  .save-picker-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .save-picker-item:hover {
    background: rgba(255,255,255,0.05);
  }

  .save-picker-count {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .save-picker-divider {
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .save-picker-new-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .save-picker-input {
    flex: 1;
    padding: 8px 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
  }

  .save-picker-input:focus {
    border-color: var(--accent-primary);
  }

  .save-picker-create {
    padding: 8px 14px;
    background: var(--accent-primary);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .save-picker-create:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pl-art-btn {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px dashed rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.02);
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }

  .pl-art-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #fff;
    border-color: rgba(255,255,255,0.4);
  }

  /* ====== Add Songs Panel ====== */
  .add-songs-panel {
    max-width: 520px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .add-songs-search-row {
    display: flex;
    align-items: center;
  }

  .add-songs-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    height: 36px;
    padding: 0 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 10px;
    transition: all 0.15s ease;
  }

  .add-songs-search-bar:focus-within {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.14);
  }

  .add-songs-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 13px;
    min-width: 0;
  }

  .add-songs-search-input::placeholder {
    color: var(--text-tertiary);
  }

  .add-songs-search-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: background 0.12s;
  }

  .add-songs-search-clear:hover {
    background: rgba(255,255,255,0.14);
  }

  .add-songs-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .add-songs-section-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    padding: 4px 8px 2px;
  }

  .add-songs-tracklist {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .add-songs-track {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .add-songs-track:hover {
    background: rgba(255,255,255,0.03);
  }

  .add-songs-check {
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--text-tertiary);
    border-radius: 4px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
  }

  .add-songs-check.checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
  }

  .add-songs-check.checked::after {
    content: '✓';
    font-size: 10px;
    color: #000;
    font-weight: 700;
  }

  .add-songs-track-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    font-size: 13px;
    color: var(--text-primary);
  }

  .add-songs-track-artist {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .add-songs-duration {
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .add-songs-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .add-songs-selected-count {
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .add-songs-empty {
    font-size: 13px;
    color: var(--text-tertiary);
    padding: 12px 8px;
    text-align: center;
  }

  .add-songs-panel .save-picker-create,
  .add-songs-panel .add-songs-yt-btn {
    color: #000;
  }

  .add-songs-yt-btn {
    padding: 8px 14px;
    background: var(--accent-primary);
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .add-songs-yt-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .add-songs-yt-error {
    font-size: 12px;
    color: var(--accent-error, #f44336);
    padding: 4px 0;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes fadeInScale {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>