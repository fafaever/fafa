export interface TurtleSoupPuzzle {
  id: string;
  title: string;
  category: string;
  difficulty: number; // 1 to 5
  surface: string; // 汤面
  base: string; // 汤底
  keyClues: string[]; // 关键词/关键要点
  sampleQuestions?: {
    question: string;
    answer: "是" | "否" | "无关" | "是与否无关" | "关键/接近";
    explanation?: string;
  }[];
}

export const TURTLE_SOUP_PRESETS: TurtleSoupPuzzle[] = [
  {
    id: "sea_turtle_soup_classic",
    title: "海龟汤 (经典原版)",
    category: "经典悬疑",
    difficulty: 4,
    surface: "一个男子走进海边餐馆，点了一碗“海龟汤”。尝了一口后，他流下了眼泪，离开餐馆后便自杀了。为什么？",
    base: "男子曾经遭遇海难，和同伴困在荒岛。当时同伴煮了一碗“海龟汤”救了他的命。后来男子幸存脱险，在餐馆吃到真正的海龟汤，发现味道完全不同，才意识到当年在荒岛上同伴为了救他，用自己的肉做成了那碗“海龟汤”并牺牲了。男子悲痛欲绝自杀。",
    keyClues: ["海难/荒岛", "同伴牺牲", "用同伴肉做汤", "味道不一样", "真相大白后绝望"],
    sampleQuestions: [
      { question: "男子的眼泪是因为汤不好吃吗？", answer: "否" },
      { question: "男子以前喝过海龟汤吗？", answer: "是", explanation: "他以为自己喝过，但其实没有。" },
      { question: "男子曾经遇到过海难吗？", answer: "关键/接近", explanation: "这是核心关键剧情！" },
      { question: "餐馆里的海龟汤有毒吗？", answer: "否" },
      { question: "当年在荒岛上同伴是不是牺牲了自己？", answer: "是" },
    ],
  },
  {
    id: "water_plants",
    title: "水草与水鬼",
    category: "恐怖悬疑",
    difficulty: 3,
    surface: "一个男子重游故地，来到曾经溺水被救的河边。他蹲下伸手摸了摸水里的水草，突然脸色大变，痛苦万分并跳河自尽了。为什么？",
    base: "当年他在此处落水，感觉有东西缠住了脚，当时同伴把他救了上来，告诉他是被“水草”缠住了。如今他重游故地摸到真正的水草，发现水草非常柔滑根本不会缠人，才明白当年缠住他脚的其实是另一个同伴的头发，那个同伴为了推他上去而自己淹死了。",
    keyClues: ["当年落水", "以为是被水草缠住", "摸到水草柔滑不缠人", "缠脚的是同伴头发", "同伴牺牲了自己"],
    sampleQuestions: [
      { question: "水草有毒吗？", answer: "否" },
      { question: "男子当年真的是被水草缠住的吗？", answer: "否" },
      { question: "当年救他的同伴是不是有瞒着他的事？", answer: "是" },
      { question: "当年缠住他脚的是人的头发吗？", answer: "关键/接近" },
    ],
  },
  {
    id: "half_a_match",
    title: "半根火柴",
    category: "硬核推理",
    difficulty: 4,
    surface: "一个人裸体趴在沙漠里，手里死死握着半根断火柴，身上没有任何外伤。发生了什么？",
    base: "他和朋友们乘热气球飞越沙漠，热气球漏气燃料不足正迅速坠落。大家脱光衣服抛掉所有行李重物后依然超重。最后他们决定折断一根火柴抽签，谁抽到半根断火柴谁就必须跳下去救其他人。他不幸抽中死签跳下（无伞）坠亡在沙漠中。",
    keyClues: ["热气球坠落", "抛弃衣服重物", "抽签决定生死", "断火柴是抽签道具", "为了救其他人而跳下"],
    sampleQuestions: [
      { question: "他是被人谋杀的吗？", answer: "否" },
      { question: "他是从高空掉下来的吗？", answer: "是" },
      { question: "火柴是用来点火的吗？", answer: "否", explanation: "火柴是用来抽签的。" },
      { question: "当时还有其他人在一起吗？", answer: "是" },
      { question: "他们乘坐了热气球吗？", answer: "关键/接近" },
    ],
  },
  {
    id: "roller_coaster",
    title: "过山车",
    category: "心理悬疑",
    difficulty: 3,
    surface: "一个盲人刚做完眼部手术恢复光明，兴奋地去游乐园坐过山车。过山车刚开进漆黑的山洞时，他突然跳下了过山车。为什么？",
    base: "盲人做完手术恢复视力非常高兴。当过山车开进黑暗的山洞时，眼前一片漆黑，他误以为自己的眼睛又失明复发了。无法承受再次失明的绝望与打击，他在恐慌中跳下了过山车。",
    keyClues: ["刚做完眼部手术", "过山车开进山洞", "眼前一片漆黑", "误以为又失明了", "绝望跳车"],
    sampleQuestions: [
      { question: "过山车故障了吗？", answer: "否" },
      { question: "山洞里有怪物或危险吗？", answer: "否" },
      { question: "与他的眼部手术有关吗？", answer: "是" },
      { question: "他是以为自己又失明了吗？", answer: "关键/接近" },
    ],
  },
  {
    id: "dwarf_wood_chips",
    title: "木屑与盲人",
    category: "暗黑推理",
    difficulty: 5,
    surface: "马戏团里有两个侏儒，其中一个是盲人。有一天盲人侏儒在房间里摸到了很多木屑，随后便在绝望中自杀了。为什么？",
    base: "马戏团老板宣布要裁员辞退身材较高的那个侏儒。为了保住自己的工作，另一个侏儒趁盲人侏儒睡觉时，悄悄溜进盲人房间，锯短了他的拐杖和桌椅腿。盲人醒来摸到锯出的木屑，拄着变短的拐杖以为自己长高了，误认为将被辞退，悲伤之下自杀。",
    keyClues: ["马戏团裁员高个侏儒", "另一个侏儒陷害", "锯短拐杖与家具", "摸到木屑", "误以为自己长高了"],
    sampleQuestions: [
      { question: "木屑是盲人自己锯家具留下的吗？", answer: "否" },
      { question: "有另一个人进了盲人的房间吗？", answer: "是" },
      { question: "盲人自杀是因为以为自己长高了吗？", answer: "关键/接近" },
    ],
  },
  {
    id: "funeral_eyes",
    title: "葬礼上的眼眸",
    category: "心理变态",
    difficulty: 2,
    surface: "女子在母亲的葬礼上看见了一个极为帅气的男子，对他一见钟情。葬礼结束后几天，女子亲手杀死了自己的亲姐姐。为什么？",
    base: "女子极度渴望再次见到那个帅气男子，但他没有留联系方式。女子认为那个男子只会在家族举办葬礼时出现，因此她杀死了自己的亲姐姐，以便再次举办葬礼见到他。",
    keyClues: ["对男子一见钟情", "没有联系方式", "以为葬礼能再见到他", "杀姐姐为了再办一次葬礼"],
    sampleQuestions: [
      { question: "姐姐抢了那个男子吗？", answer: "否" },
      { question: "杀姐姐是为了再次举办葬礼吗？", answer: "关键/接近" },
    ],
  },
];
