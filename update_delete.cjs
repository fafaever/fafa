const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const oldHandleDelete = `  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDialog({
      title: "删除帖子",
      message: "确定要彻底删除该帖子吗？删除后不可恢复。",
      onConfirm: () => {
        setPosts(prev => prev.filter(p => p.id !== postId));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(null);
        }
        showToast("帖子已成功删除");
        setConfirmDialog(null);
      }
    });
  };`;

const newHandleDelete = `  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmDialog({
      title: "删除帖子",
      message: "确定要删除此帖吗？删除后不可恢复",
      onConfirm: () => {
        const postToDelete = posts.find(p => p.id === postId);
        if (postToDelete) {
          characters.forEach(char => {
            const memKey = \`mobile_ai_memories_\${char.id}\`;
            const memStr = localStorage.getItem(memKey);
            if (memStr) {
              try {
                const mems = JSON.parse(memStr);
                const filtered = mems.filter((m: any) => m.text !== postToDelete.content && !m.text.includes(postToDelete.content.substring(0, Math.min(20, postToDelete.content.length))));
                if (filtered.length !== mems.length) {
                  localStorage.setItem(memKey, JSON.stringify(filtered));
                }
              } catch (err) {}
            }
          });
        }
        
        setPosts(prev => prev.filter(p => p.id !== postId));
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(null);
        }
        showToast("帖子已成功删除");
        setConfirmDialog(null);
      }
    });
  };`;

code = code.replace(oldHandleDelete, newHandleDelete);
fs.writeFileSync(file, code, 'utf8');
