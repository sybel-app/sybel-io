import rgb2hex from "rgb2hex";

// Immutable data object
export class nftJson {
  constructor(
    readonly id: number,
    readonly image: string,
    readonly name: string,
    readonly description: string,
    readonly background_color: string,
    readonly rarity: string
  ) {}

  toJson(): string {
    return JSON.stringify({
      id: this.id,
      image: this.image,
      name: this.name,
      description: this.description,
      background_color: rgb2hex(this.background_color).hex,
      attributes: [
        {
          trait_type: "Rarity",
          value: this.rarity,
        },
        { trait_type: "Type", value: "Podcast" },
      ],
    });
  }
}
