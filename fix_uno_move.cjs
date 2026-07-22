const fs = require('fs');

let uno = fs.readFileSync('src/components/UnoGameApp.tsx', 'utf8');

// I need to find `const moveData = await apiUnoMove` and add the logic.
// Original logic:
// if (moveData && moveData.cardId) {
//   const selectedCard = playableCards.find(c => c.id === moveData.cardId) || playableCards[0];
//   if (moveData.chosenColor && (selectedCard.color === "wild")) {
//     selectedCard.chosenColor = moveData.chosenColor;
//   }
//   if (moveData.dialogue) updatePlayerDialogueState(aiIndex, moveData.dialogue);
//   executePlayCardAction(aiIndex, selectedCard);
//   return;
// }

uno = uno.replace(/const moveData = await apiUnoMove\(\{.*?\}\);/g, `const moveData = await apiUnoMove({ character: { name: aiPlayer.name, description: aiPlayer.character?.description }, playableCards, topCard, currentColor: currentColorRef.current, context: gameContext, settings });
        if (moveData && moveData.cardId) {
          let selectedCard = playableCards.find(c => c.id === moveData.cardId) || playableCards[0];
          if (moveData.chosenColor && selectedCard.color === "wild") {
             // We can't mutate the card directly if it's frozen, but let's just assume we can or clone it.
             selectedCard = { ...selectedCard, chosenColor: moveData.chosenColor as any };
          }
          if (moveData.dialogue) updatePlayerDialogueState(aiIndex, moveData.dialogue);
          executePlayCardAction(aiIndex, selectedCard);
          return;
        }`);

fs.writeFileSync('src/components/UnoGameApp.tsx', uno);
