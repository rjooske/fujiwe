<script module lang="ts">
  function unreachable(_: never): never {
    throw new Error("should be unreachable");
  }

  export type FujiweEmotion = "neutral" | "angry" | "happy" | "sad";
  export type FujiweDialog = { emotion: FujiweEmotion; text: string };

  function emotionToImageSource(e: FujiweEmotion): string {
    switch (e) {
      case "neutral":
        return "images/fujiwe.png";
      case "angry":
        return "images/fujiwe_angry.png";
      case "happy":
        return "images/fujiwe_happy.png";
      case "sad":
        return "images/fujiwe_sad.png";
      default:
        unreachable(e);
    }
  }
</script>

<script lang="ts">
  let { dialog }: { dialog: FujiweDialog } = $props();
</script>

<div class="root">
  <img src={emotionToImageSource(dialog.emotion)} alt="フジヱ" />
  {#if dialog.text !== ""}
    <div>
      <img src="images/speech_bubble.svg" alt="" />
      <div>{dialog.text}</div>
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    width: 520px;
    height: 300px;
    position: relative;

    & > div {
      position: absolute;
      top: 100px;
      left: 220px;

      & > div {
        margin: 0;
        position: absolute;
        top: 20px;
        left: 60px;
        right: 20px;
        bottom: 30px;
        display: grid;
        place-content: center;
      }
    }
  }
</style>
