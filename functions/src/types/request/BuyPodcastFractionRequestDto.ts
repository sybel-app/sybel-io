import BaseRequestDto from "./BaseRequestDto";

interface BuyPodcastFractionRequestDto extends BaseRequestDto {
  seriesId: string;
  tokenType: number;
  count: number;
}

export default BuyPodcastFractionRequestDto;
