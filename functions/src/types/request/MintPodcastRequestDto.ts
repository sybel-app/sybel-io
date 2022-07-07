import PodcastInfo from "./PodcastInfo";

interface MintPodcastRequestDto {
  id: string;
  seriesId: string;
  podcastInfo: PodcastInfo;
}

export default MintPodcastRequestDto;
