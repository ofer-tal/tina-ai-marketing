/**
 * TikTok Trending Audio Service
 *
 * Manages trending audio tracks for TikTok content.
 * Features:
 * - Query trending audio library
 * - Select audio based on content niche/mood
 * - Verify audio quality and compatibility
 * - Track audio usage statistics
 * - Audio metadata management
 *
 * Note: TikTok's official API does not provide trending sounds endpoint.
 * This service maintains a curated library of popular tracks.
 */

import { getLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = getLogger('services', 'tiktok-trending-audio');

class TikTokTrendingAudioService {
  constructor(config = {}) {
    this.audioLibraryPath = config.audioLibraryPath || process.env.TIKTOK_AUDIO_LIBRARY_PATH || './audio-library/tiktok';
    this.enabled = process.env.ENABLE_TIKTOK_AUDIO === 'true';
    this.audioLibrary = [];
    this.usageStats = new Map();

    // Niche/mood to audio category mappings
    this.nicheMappings = {
      'romantic': ['love', 'romance', 'ballad', 'emotional'],
      'spicy': ['trending', 'viral', 'upbeat', 'sensual'],
      'drama': ['intense', 'dramatic', 'cinematic', 'tension'],
      'fantasy': ['ethereal', 'magical', 'orchestral', 'dreamy'],
      'contemporary': ['pop', 'modern', 'upbeat', 'trending'],
      'mystery': ['suspense', 'mysterious', 'dark', 'atmospheric'],
    };

    // Initialize audio library
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('Initializing TikTok Trending Audio Service...', {
        enabled: this.enabled,
        audioLibraryPath: this.audioLibraryPath
      });

      // Load audio library from file or use built-in library
      await this.loadAudioLibrary();

      logger.info('TikTok Trending Audio Service initialized', {
        trackCount: this.audioLibrary.length,
        categories: [...new Set(this.audioLibrary.map(t => t.category))].length
      });
    } catch (error) {
      logger.error('Failed to initialize TikTok Trending Audio Service', {
        error: error.message
      });
      // Initialize with empty library
      this.audioLibrary = this.getBuiltInLibrary();
    }
  }

  /**
   * Get built-in trending audio library
   * This is a curated list of popular tracks (simulated for demo)
   * In production, this would be synced from external sources
   */
  getBuiltInLibrary() {
    return [
      {
        id: 'tt_audio_001',
        title: 'Ramalama (Fast Part)',
        artist: 'Róisín Murphy',
        category: 'viral',
        mood: 'energetic',
        duration: 15,
        popularity: 98,
        trendingDate: '2025-12-01',
        genres: ['electronic', 'dance'],
        niches: ['spicy', 'contemporary', 'drama'],
        audioPath: null, // Would be path to actual audio file
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_002',
        title: 'Headshot',
        artist: 'iShowSpeed',
        category: 'trending',
        mood: 'energetic',
        duration: 20,
        popularity: 95,
        trendingDate: '2025-10-15',
        genres: ['hip-hop', 'trap'],
        niches: ['spicy', 'contemporary', 'fantasy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_003',
        title: 'Wish (Orchestra Version)',
        artist: 'Trippie Redd',
        category: 'viral',
        mood: 'emotional',
        duration: 18,
        popularity: 92,
        trendingDate: '2025-11-20',
        genres: ['hip-hop', 'orchestral'],
        niches: ['romantic', 'drama', 'fantasy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_004',
        title: 'Espresso',
        artist: 'Sabrina Carpenter',
        category: 'trending',
        mood: 'upbeat',
        duration: 15,
        popularity: 99,
        trendingDate: '2025-06-01',
        genres: ['pop', 'dance'],
        niches: ['contemporary', 'romantic', 'spicy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false, // Copyright - use with caution
        usageCount: 0
      },
      {
        id: 'tt_audio_005',
        title: 'Good Luck, Babe!',
        artist: 'Chappell Roan',
        category: 'viral',
        mood: 'empowering',
        duration: 22,
        popularity: 97,
        trendingDate: '2025-04-10',
        genres: ['pop', 'synth-pop'],
        niches: ['contemporary', 'drama', 'romantic'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false,
        usageCount: 0
      },
      {
        id: 'tt_audio_006',
        title: 'Beautiful Things',
        artist: 'Benson Boone',
        category: 'trending',
        mood: 'emotional',
        duration: 16,
        popularity: 94,
        trendingDate: '2025-02-15',
        genres: ['pop', 'ballad'],
        niches: ['romantic', 'drama', 'fantasy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false,
        usageCount: 0
      },
      {
        id: 'tt_audio_007',
        title: 'Pedro',
        artist: 'Jaxomy, Agatino Romero',
        category: 'viral',
        mood: 'energetic',
        duration: 12,
        popularity: 96,
        trendingDate: '2025-01-20',
        genres: ['electronic', 'dance'],
        niches: ['spicy', 'contemporary', 'drama'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_008',
        title: 'A Bar Song (Tipsy)',
        artist: 'Shaboozey',
        category: 'trending',
        mood: 'upbeat',
        duration: 20,
        popularity: 93,
        trendingDate: '2025-05-10',
        genres: ['country', 'pop'],
        niches: ['contemporary', 'romantic', 'spicy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false,
        usageCount: 0
      },
      {
        id: 'tt_audio_009',
        title: 'Million Dollar Baby',
        artist: 'Tommy Richman',
        category: 'viral',
        mood: 'smooth',
        duration: 14,
        popularity: 91,
        trendingDate: '2025-04-20',
        genres: ['r&b', 'soul'],
        niches: ['romantic', 'contemporary'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false,
        usageCount: 0
      },
      {
        id: 'tt_audio_010',
        title: 'Not Like Us',
        artist: 'Kendrick Lamar',
        category: 'trending',
        mood: 'intense',
        duration: 18,
        popularity: 90,
        trendingDate: '2025-05-05',
        genres: ['hip-hop'],
        niches: ['drama', 'contemporary', 'spicy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: false,
        usageCount: 0
      },
      // Copyright-safe / royalty-free options
      {
        id: 'tt_audio_101',
        title: 'Trending Beat 1 - Upbeat Pop',
        artist: 'Royalty-Free Library',
        category: 'royalty-free',
        mood: 'upbeat',
        duration: 15,
        popularity: 85,
        trendingDate: '2025-01-01',
        genres: ['pop', 'electronic'],
        niches: ['contemporary', 'romantic', 'spicy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_102',
        title: 'Cinematic Romance',
        artist: 'Royalty-Free Library',
        category: 'royalty-free',
        mood: 'romantic',
        duration: 20,
        popularity: 82,
        trendingDate: '2025-01-01',
        genres: ['orchestral', 'soundtrack'],
        niches: ['romantic', 'fantasy', 'drama'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_103',
        title: 'Dark Tension Builder',
        artist: 'Royalty-Free Library',
        category: 'royalty-free',
        mood: 'intense',
        duration: 18,
        popularity: 80,
        trendingDate: '2025-01-01',
        genres: ['cinematic', 'electronic'],
        niches: ['drama', 'mystery', 'fantasy'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_104',
        title: 'Dreamy Atmosphere',
        artist: 'Royalty-Free Library',
        category: 'royalty-free',
        mood: 'ethereal',
        duration: 16,
        popularity: 78,
        trendingDate: '2025-01-01',
        genres: ['ambient', 'electronic'],
        niches: ['fantasy', 'romantic', 'mystery'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      },
      {
        id: 'tt_audio_105',
        title: 'Viral Dance Beat',
        artist: 'Royalty-Free Library',
        category: 'royalty-free',
        mood: 'energetic',
        duration: 15,
        popularity: 88,
        trendingDate: '2025-01-01',
        genres: ['electronic', 'dance'],
        niches: ['spicy', 'contemporary', 'drama'],
        audioPath: null,
        previewUrl: null,
        isCopyrightSafe: true,
        usageCount: 0
      }
    ];
  }

  /**
   * Load audio library from storage
   */
  async loadAudioLibrary() {
    try {
      const libraryPath = path.join(this.audioLibraryPath, 'library.json');
      const data = await fs.readFile(libraryPath, 'utf-8');
      this.audioLibrary = JSON.parse(data);
      logger.info('Audio library loaded from file', {
        path: libraryPath,
        trackCount: this.audioLibrary.length
      });
    } catch (error) {
      logger.warn('Could not load audio library from file, using built-in library', {
        error: error.message
      });
      this.audioLibrary = this.getBuiltInLibrary();
    }
  }

  /**
   * Step 1: Query TikTok trending sounds API
   * Returns trending audio tracks filtered by various criteria
   */
  async getTrendingAudio(options = {}) {
    const {
      category,
      mood,
      niche,
      genre,
      minPopularity = 70,
      copyrightSafe = false,
      limit = 20,
      offset = 0
    } = options;

    try {
      logger.info('Querying trending audio', { options });

      let results = [...this.audioLibrary];

      // Filter by category
      if (category) {
        results = results.filter(track => track.category === category);
      }

      // Filter by mood
      if (mood) {
        results = results.filter(track => track.mood === mood);
      }

      // Filter by niche
      if (niche) {
        const nicheCategories = this.nicheMappings[niche] || [];
        results = results.filter(track =>
          track.niches.includes(niche) ||
          nicheCategories.some(cat => track.mood.toLowerCase().includes(cat))
        );
      }

      // Filter by genre
      if (genre) {
        results = results.filter(track => track.genres.includes(genre));
      }

      // Filter by minimum popularity
      results = results.filter(track => track.popularity >= minPopularity);

      // Filter by copyright safety
      if (copyrightSafe) {
        results = results.filter(track => track.isCopyrightSafe === true);
      }

      // Sort by popularity (descending) and trending date
      results.sort((a, b) => {
        if (b.popularity !== a.popularity) {
          return b.popularity - a.popularity;
        }
        return new Date(b.trendingDate) - new Date(a.trendingDate);
      });

      // Apply pagination
      const paginatedResults = results.slice(offset, offset + limit);
      const totalCount = results.length;

      logger.info('Trending audio query completed', {
        resultsCount: paginatedResults.length,
        totalAvailable: totalCount
      });

      return {
        success: true,
        audio: paginatedResults,
        total: totalCount,
        offset,
        limit
      };
    } catch (error) {
      logger.error('Failed to query trending audio', {
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        audio: []
      };
    }
  }

  /**
   * Step 2: Select trending audio for niche
   * Intelligently selects the best audio track based on content analysis
   */
  async selectAudioForContent(contentMetadata) {
    const {
      niche,
      mood,
      targetDuration,
      excludeIds = [],
      preferCopyrightSafe = true
    } = contentMetadata;

    try {
      logger.info('Selecting audio for content', { contentMetadata });

      // Build query options
      const queryOptions = {
        niche,
        mood,
        minPopularity: 75,
        copyrightSafe: preferCopyrightSafe,
        limit: 50
      };

      // Get candidate tracks
      const { audio: candidates } = await this.getTrendingAudio(queryOptions);

      if (!candidates || candidates.length === 0) {
        logger.warn('No matching audio tracks found', { niche, mood });
        return {
          success: false,
          error: 'No suitable audio tracks found',
          selectedTrack: null
        };
      }

      // Filter out excluded tracks
      const filtered = candidates.filter(track => !excludeIds.includes(track.id));

      // Score each track based on multiple factors
      const scoredTracks = filtered.map(track => {
        let score = 0;

        // Popularity score (0-40 points)
        score += (track.popularity / 100) * 40;

        // Copyright safety bonus (0-20 points)
        if (preferCopyrightSafe && track.isCopyrightSafe) {
          score += 20;
        }

        // Duration match (0-20 points)
        if (targetDuration) {
          const durationDiff = Math.abs(track.duration - targetDuration);
          score += Math.max(0, 20 - durationDiff);
        }

        // Mood match (0-20 points)
        if (mood && track.mood === mood) {
          score += 20;
        }

        // Recent trending bonus (0-10 points)
        const daysSinceTrending = Math.floor(
          (Date.now() - new Date(track.trendingDate)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceTrending < 30) {
          score += 10 - (daysSinceTrending / 3);
        }

        return { ...track, score };
      });

      // Sort by score
      scoredTracks.sort((a, b) => b.score - a.score);

      // Select top track
      const selectedTrack = scoredTracks[0];

      // Update usage stats
      this.trackUsage(selectedTrack.id);

      logger.info('Audio selected for content', {
        trackId: selectedTrack.id,
        title: selectedTrack.title,
        score: selectedTrack.score.toFixed(2)
      });

      return {
        success: true,
        selectedTrack,
        alternatives: scoredTracks.slice(1, 6) // Return top 5 alternatives
      };
    } catch (error) {
      logger.error('Failed to select audio for content', {
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        selectedTrack: null
      };
    }
  }

  /**
   * Track audio usage statistics
   */
  trackUsage(audioId) {
    const current = this.usageStats.get(audioId) || 0;
    this.usageStats.set(audioId, current + 1);

    // Also update in library
    const track = this.audioLibrary.find(t => t.id === audioId);
    if (track) {
      track.usageCount = (track.usageCount || 0) + 1;
    }
  }

  /**
   * Get audio track by ID
   */
  getAudioById(audioId) {
    const track = this.audioLibrary.find(t => t.id === audioId);
    if (!track) {
      return {
        success: false,
        error: 'Audio track not found'
      };
    }

    return {
      success: true,
      track
    };
  }

  /**
   * Step 4: Verify audio matches TikTok trend
   * Validates that audio metadata matches current TikTok trends
   */
  async verifyAudioTrack(audioId) {
    try {
      logger.info('Verifying audio track', { audioId });

      const { success, track, error } = this.getAudioById(audioId);

      if (!success || !track) {
        return {
          success: false,
          error: error || 'Track not found',
          verified: false
        };
      }

      // Verification checks
      const checks = {
        exists: true,
        validDuration: track.duration >= 10 && track.duration <= 30,
        recentTrend: this.isRecentTrend(track.trendingDate),
        minPopularity: track.popularity >= 70,
        metadata: this.hasValidMetadata(track)
      };

      const allChecksPassed = Object.values(checks).every(check => check === true);

      logger.info('Audio track verification completed', {
        audioId,
        verified: allChecksPassed,
        checks
      });

      return {
        success: true,
        verified: allChecksPassed,
        track,
        checks
      };
    } catch (error) {
      logger.error('Failed to verify audio track', {
        error: error.message,
        audioId
      });
      return {
        success: false,
        error: error.message,
        verified: false
      };
    }
  }

  /**
   * Check if trending date is recent (within 90 days)
   */
  isRecentTrend(trendingDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(trendingDate)) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 90;
  }

  /**
   * Check if track has valid metadata
   */
  hasValidMetadata(track) {
    return !!(
      track.id &&
      track.title &&
      track.artist &&
      track.category &&
      track.mood &&
      track.duration &&
      track.genres &&
      Array.isArray(track.genres)
    );
  }

  /**
   * Step 5: Test audio quality and sync
   * Validates audio file quality using FFprobe
   */
  async testAudioQuality(audioPath) {
    try {
      logger.info('Testing audio quality', { audioPath });

      // Use FFprobe to analyze audio
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${audioPath}"`;
      const { stdout } = await execAsync(command);

      const metadata = JSON.parse(stdout);

      // Extract audio stream info
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      if (!audioStream) {
        return {
          success: false,
          error: 'No audio stream found in file'
        };
      }

      // Quality checks
      const quality = {
        codec: audioStream.codec_name,
        sampleRate: parseInt(audioStream.sample_rate),
        channels: audioStream.channels,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        duration: parseFloat(metadata.format.duration),
        checks: {
          validCodec: ['aac', 'mp3', 'm4a', 'wav', 'opus'].includes(audioStream.codec_name),
          goodSampleRate: parseInt(audioStream.sample_rate) >= 44100,
          stereo: audioStream.channels === 2,
          goodBitrate: (parseInt(metadata.format.bit_rate) || 0) >= 128000,
          validDuration: parseFloat(metadata.format.duration) >= 10 && parseFloat(metadata.format.duration) <= 30
        }
      };

      quality.passed = Object.values(quality.checks).every(check => check === true);

      logger.info('Audio quality test completed', {
        passed: quality.passed,
        codec: quality.codec,
        sampleRate: quality.sampleRate,
        duration: quality.duration
      });

      return {
        success: true,
        quality
      };
    } catch (error) {
      logger.error('Failed to test audio quality', {
        error: error.message,
        audioPath
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const stats = {
      totalTracks: this.audioLibrary.length,
      copyrightSafe: this.audioLibrary.filter(t => t.isCopyrightSafe).length,
      categories: {},
      moods: {},
      topUsed: []
    };

    // Count by category
    this.audioLibrary.forEach(track => {
      stats.categories[track.category] = (stats.categories[track.category] || 0) + 1;
      stats.moods[track.mood] = (stats.moods[track.mood] || 0) + 1;
    });

    // Top used tracks
    stats.topUsed = [...this.audioLibrary]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        title: t.title,
        usageCount: t.usageCount || 0
      }));

    return stats;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Check if FFprobe is available
      const { stdout } = await execAsync('ffprobe -version');
      const ffprobeAvailable = stdout.includes('ffprobe');

      return {
        healthy: true,
        ffprobeAvailable,
        trackCount: this.audioLibrary.length,
        enabled: this.enabled
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        ffprobeAvailable: false
      };
    }
  }
}

export default new TikTokTrendingAudioService();
