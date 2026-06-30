import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const YOUTUBERS = [
  {
    name: 'Jack Roberts',
    channelId: 'UCxVxcTULO9cFU6SB9qVaisQ',
    handle: '@Itssssss_Jack',
  },
  {
    name: 'Nick Saraev',
    channelId: 'UCbo-KbSjJDG6JWQ_MTZ_rNA',
    handle: '@nicksaraev',
  },
  {
    name: 'Julian Goldie SEO',
    channelId: 'UCGpsgNbzdF7BECCVbB1COHw',
    handle: '@JulianGoldieSEO',
  },
];

async function fetchYoutubeVideos(channelId: string) {
  try {
    const response = await axios.get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const videos: any[] = [];
    $('entry').each((i, el) => {
      if (i >= 3) return; // Only 3 videos per YouTuber

      const title = $(el).find('title').text();
      const link = $(el).find('link').attr('href');
      const published = $(el).find('published').text();
      const videoId = $(el).find('yt\\:videoId').text();
      
      videos.push({
        title,
        link,
        published,
        videoId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    });

    return videos;
  } catch (error) {
    console.error(`Error fetching YouTube feed for ${channelId}:`, error);
    return [];
  }
}

export async function GET() {
  try {
    const results = await Promise.all(
      YOUTUBERS.map(async (yt) => {
        const videos = await fetchYoutubeVideos(yt.channelId);
        return {
          ...yt,
          videos,
        };
      })
    );

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
