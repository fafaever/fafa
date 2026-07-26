const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/HomeScreen.tsx');
let code = fs.readFileSync(file, 'utf8');

// Insert state for latest forum post
const searchState = 'const [resetMenuCard, setResetMenuCard] = useState<"left" | "right" | null>(null);';
const insertState = `
  const [latestForumPost, setLatestForumPost] = useState<any>(null);
  const [latestForumBoardName, setLatestForumBoardName] = useState<string>("");

  useEffect(() => {
    try {
      const storedPosts = localStorage.getItem("mobile_ai_forum_posts");
      if (storedPosts) {
        const posts = JSON.parse(storedPosts);
        if (Array.isArray(posts) && posts.length > 0) {
          // Find the post with the latest comment, or just the latest post if no comments
          let latestPost = posts[0];
          let latestTime = posts[0].timestamp;
          
          for (const post of posts) {
            let postLatestTime = post.timestamp;
            if (post.comments && post.comments.length > 0) {
              const lastComment = post.comments[post.comments.length - 1];
              if (lastComment.timestamp > postLatestTime) {
                postLatestTime = lastComment.timestamp;
              }
            }
            if (postLatestTime > latestTime) {
              latestTime = postLatestTime;
              latestPost = post;
            }
          }
          
          setLatestForumPost(latestPost);
          
          const storedBoards = localStorage.getItem("mobile_ai_forum_boards");
          if (storedBoards) {
            const boards = JSON.parse(storedBoards);
            const board = boards.find((b: any) => b.id === latestPost.boardId);
            if (board) setLatestForumBoardName(board.name);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
`;
code = code.replace(searchState, searchState + insertState);
fs.writeFileSync(file, code, 'utf8');
console.log("State inserted.");
