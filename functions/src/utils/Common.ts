/**
 * Chunk an array into a given size (so for [1, 2, 3, 4] chunked by 2 it will give us [[1, 2], [3, 4]])
 * @param arr The array to slide
 * @param chunkSize The chunk sice to produce
 * @returns The list of all the builded chunk
 */
export function sliceIntoChunks(arr: Array<any>, chunkSize: number) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}
