import BaseRequestDto from "./BaseRequestDto";
import PodcastInfo from "./PodcastInfo";

interface MintPodcastRequestDto extends BaseRequestDto {
  seriesId: string;
  podcastInfo: PodcastInfo;
}

export default MintPodcastRequestDto;
