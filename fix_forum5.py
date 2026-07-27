import re

with open('./src/components/ForumApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace list render
list_render_target = """                        <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3 whitespace-pre-wrap">
                          {post.content}
                        </p>"""

list_render_replacement = """                        {post.isFoundPhone && post.title && (
                          <div className="font-bold text-[13px] text-neutral-900 mb-2">{post.title}</div>
                        )}
                        <p className="text-[13px] text-neutral-800 leading-relaxed font-medium mb-3 line-clamp-3 whitespace-pre-wrap">
                          {post.isFoundPhone ? (post.chatLogs ? "[聊天记录] " + (post.chatLogs.length > 0 ? post.chatLogs[0].content : "") : post.content) : post.content}
                        </p>"""

content = content.replace(list_render_target, list_render_replacement)

# Replace detail render
detail_render_target = """              <p className="text-[13px] text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedPost.content}
              </p>"""

detail_render_replacement = """              {selectedPost.isFoundPhone && selectedPost.title && (
                <div className="font-bold text-base text-neutral-900 mb-2">{selectedPost.title}</div>
              )}
              {selectedPost.isFoundPhone && selectedPost.chatLogs && Array.isArray(selectedPost.chatLogs) ? (
                <div className="bg-neutral-100 rounded-xl h-[400px] overflow-y-auto p-4 space-y-3 relative shadow-inner border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 text-center mb-4">聊天记录开始</div>
                  {selectedPost.chatLogs.map((log: any, idx: number) => (
                    <div key={idx} className={`flex flex-col max-w-[80%] ${log.isRight ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className="text-[10px] text-neutral-400 mb-1 flex items-center gap-1.5">
                        <span className="font-bold text-neutral-500">{log.sender}</span>
                        <span>{log.time}</span>
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${log.isRight ? 'bg-neutral-900 text-white rounded-tr-xs' : 'bg-white text-neutral-800 border border-neutral-200 rounded-tl-xs'}`}>
                        {log.content}
                      </div>
                    </div>
                  ))}
                  <div className="text-[10px] text-neutral-400 text-center mt-4 pt-4">没有更多消息了</div>
                </div>
              ) : (
                <p className="text-[13px] text-neutral-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedPost.content}
                </p>
              )}"""

content = content.replace(detail_render_target, detail_render_replacement)

with open('./src/components/ForumApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

