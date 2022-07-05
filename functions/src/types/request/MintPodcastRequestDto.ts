import PodcastInfo from "./PodcastInfo";

interface MintPodcastRequestDto {
  id: string;
  supply: number[];
  podcastInfo: PodcastInfo;
}

export default MintPodcastRequestDto;
