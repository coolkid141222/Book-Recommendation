import { type ReactNode, useState } from "react";
import { BookOpen, Search, ShoppingCart, Sparkles, DatabaseZap, Download, BrainCircuit, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Category = "全部" | "文学" | "科幻" | "推理" | "奇幻" | "经管" | "历史";

type PlaceholderBook = {
  id: string;
  title: string;
  author: string;
  category: Exclude<Category, "全部">;
  badge?: string;
  discount?: string;
  price: string;
  originalPrice?: string;
  rating: number;
  ratingCount: number;
  coverClassName: string;
  accentClassName: string;
};

const categories: Category[] = ["全部", "文学", "科幻", "推理", "奇幻", "经管", "历史"];

const books: PlaceholderBook[] = [
  {
    id: "p1",
    title: "百年孤独",
    author: "加西亚·马尔克斯",
    category: "文学",
    badge: "热销",
    discount: "-33%",
    price: "45.80",
    originalPrice: "68.00",
    rating: 4,
    ratingCount: 1234,
    coverClassName: "bg-[linear-gradient(135deg,#537ba8,#9cc2d2_55%,#e6d0a8)]",
    accentClassName: "text-[#23415b]"
  },
  {
    id: "p2",
    title: "活着",
    author: "余华",
    category: "文学",
    badge: "推荐",
    discount: "-24%",
    price: "32.00",
    originalPrice: "42.00",
    rating: 4,
    ratingCount: 2156,
    coverClassName: "bg-[linear-gradient(135deg,#d5b07b,#c98f56_48%,#82573f)]",
    accentClassName: "text-[#503523]"
  },
  {
    id: "p3",
    title: "三体",
    author: "刘慈欣",
    category: "科幻",
    badge: "新书",
    price: "56.00",
    rating: 4,
    ratingCount: 3421,
    coverClassName: "bg-[linear-gradient(135deg,#613e38,#9d664b_48%,#2c3448)]",
    accentClassName: "text-[#f8e6d6]"
  },
  {
    id: "p4",
    title: "白夜行",
    author: "东野圭吾",
    category: "推理",
    discount: "-23%",
    price: "39.80",
    originalPrice: "52.00",
    rating: 4,
    ratingCount: 1876,
    coverClassName: "bg-[linear-gradient(135deg,#668cb9,#7aa0d2_40%,#d3a77b)]",
    accentClassName: "text-white"
  },
  {
    id: "p5",
    title: "挪威的森林",
    author: "村上春树",
    category: "文学",
    price: "38.00",
    rating: 4,
    ratingCount: 1543,
    coverClassName: "bg-[linear-gradient(135deg,#201816,#4f3527_46%,#7b5738)]",
    accentClassName: "text-[#f7e2c6]"
  },
  {
    id: "p6",
    title: "雪国",
    author: "川端康成",
    category: "文学",
    badge: "热销",
    discount: "-29%",
    price: "29.00",
    originalPrice: "41.00",
    rating: 4,
    ratingCount: 1264,
    coverClassName: "bg-[linear-gradient(135deg,#bcc5cf,#8d99a8_50%,#5b6980)]",
    accentClassName: "text-[#223047]"
  },
  {
    id: "p7",
    title: "沙丘",
    author: "弗兰克·赫伯特",
    category: "科幻",
    discount: "-31%",
    price: "48.00",
    originalPrice: "69.00",
    rating: 4,
    ratingCount: 2610,
    coverClassName: "bg-[linear-gradient(135deg,#d0a26f,#b16e45_48%,#7c4c33)]",
    accentClassName: "text-[#fff6eb]"
  },
  {
    id: "p8",
    title: "哈利·波特",
    author: "J.K.罗琳",
    category: "奇幻",
    badge: "推荐",
    price: "52.00",
    rating: 5,
    ratingCount: 4287,
    coverClassName: "bg-[linear-gradient(135deg,#6f5b8d,#405a8d_46%,#d6b36b)]",
    accentClassName: "text-[#fff6eb]"
  },
  {
    id: "p9",
    title: "原则",
    author: "瑞·达利欧",
    category: "经管",
    discount: "-24%",
    price: "44.00",
    originalPrice: "58.00",
    rating: 4,
    ratingCount: 1732,
    coverClassName: "bg-[linear-gradient(135deg,#1d3b56,#567791_48%,#c3d0d8)]",
    accentClassName: "text-[#eef6fb]"
  },
  {
    id: "p10",
    title: "人类简史",
    author: "尤瓦尔·赫拉利",
    category: "历史",
    badge: "热销",
    price: "49.00",
    rating: 4,
    ratingCount: 3012,
    coverClassName: "bg-[linear-gradient(135deg,#80604f,#af896f_48%,#dbc2aa)]",
    accentClassName: "text-[#fff8ef]"
  },
  {
    id: "p11",
    title: "嫌疑人X的献身",
    author: "东野圭吾",
    category: "推理",
    discount: "-18%",
    price: "35.00",
    originalPrice: "43.00",
    rating: 4,
    ratingCount: 1988,
    coverClassName: "bg-[linear-gradient(135deg,#253444,#4c6174_50%,#d19d6f)]",
    accentClassName: "text-[#fdf7ef]"
  },
  {
    id: "p12",
    title: "银河帝国",
    author: "阿西莫夫",
    category: "科幻",
    badge: "推荐",
    discount: "-21%",
    price: "46.00",
    originalPrice: "59.00",
    rating: 5,
    ratingCount: 2875,
    coverClassName: "bg-[linear-gradient(135deg,#16263f,#35527d_46%,#89b2d6)]",
    accentClassName: "text-[#f7fbff]"
  }
];

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("全部");
  const [keyword, setKeyword] = useState("");

  const filteredBooks = books.filter((book) => {
    const categoryMatch = selectedCategory === "全部" || book.category === selectedCategory;
    const keywordMatch =
      keyword.trim() === "" ||
      book.title.toLowerCase().includes(keyword.toLowerCase()) ||
      book.author.toLowerCase().includes(keyword.toLowerCase());

    return categoryMatch && keywordMatch;
  });

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(194,116,65,0.10),transparent_22%),radial-gradient(circle_at_88%_12%,rgba(25,54,66,0.12),transparent_20%),linear-gradient(180deg,rgba(251,247,239,0.98),rgba(245,238,226,0.96))]" />

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="sticky top-4 z-20 mb-8 rounded-[28px] border border-border/70 bg-card/88 px-5 py-4 shadow-[0_20px_45px_-32px_rgba(27,52,64,0.28)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex min-w-fit items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="font-display text-2xl">书城</p>
                <p className="text-sm text-muted-foreground">Bookstore Preview</p>
              </div>
            </div>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-12 rounded-2xl border-border/70 bg-background/88 pl-11 pr-4"
                placeholder="搜索书籍、作者..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <Button variant="ghost" className="size-11 rounded-2xl p-0 text-foreground">
              <ShoppingCart className="size-5" />
            </Button>
          </div>
        </header>

        <section className="rounded-[34px] border border-border/60 bg-card/76 px-4 py-5 shadow-[0_20px_55px_-35px_rgba(27,52,64,0.24)] backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgba(27,52,64,0.45)]"
                    : "bg-background/86 text-foreground hover:bg-secondary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-tight">找到 {filteredBooks.length} 本书籍</p>
              <p className="mt-2 text-sm text-muted-foreground">当前全部为占位方案卡片，先验证书城布局与视觉，不占用数据库空间。</p>
            </div>
            <Badge variant="outline" className="w-fit">
              0.5GB DB Friendly
            </Badge>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="overflow-hidden rounded-[24px] border border-border/70 bg-background/92 shadow-[0_22px_50px_-36px_rgba(27,52,64,0.22)] transition-transform duration-200 hover:-translate-y-1"
              >
                <CardContent className="p-0">
                  <div className={`relative h-80 overflow-hidden border-b border-border/60 ${book.coverClassName}`}>
                    {book.badge ? <Ribbon className="left-3 top-3 bg-[#ef4444] text-white">{book.badge}</Ribbon> : null}
                    {book.discount ? <Ribbon className="right-3 top-3 bg-[#f97316] text-white">{book.discount}</Ribbon> : null}

                    <div className="absolute inset-0 flex flex-col justify-between p-5">
                      <div className="rounded-full border border-white/25 bg-white/14 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/85 backdrop-blur-sm">
                        {book.category}
                      </div>

                      <div className={`rounded-[24px] border border-white/16 bg-black/10 p-5 backdrop-blur-[2px] ${book.accentClassName}`}>
                        <p className="text-xs uppercase tracking-[0.28em] opacity-75">Placeholder Cover</p>
                        <p className="mt-4 font-display text-3xl leading-tight">{book.title}</p>
                        <p className="mt-2 text-sm opacity-80">{book.author}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <h2 className="text-2xl font-semibold leading-tight">{book.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{book.author}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[#f5b301]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-4 ${index < book.rating ? "fill-current" : "text-[#d9d9d9]"}`}
                        />
                      ))}
                      <span className="ml-1 text-sm text-muted-foreground">({book.ratingCount})</span>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-semibold">¥{book.price}</span>
                        {book.originalPrice ? <span className="pb-1 text-sm text-muted-foreground line-through">¥{book.originalPrice}</span> : null}
                      </div>
                      <Button className="size-11 rounded-2xl p-0">
                        <ShoppingCart className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <PlanCard
            icon={<DatabaseZap className="size-5" />}
            title="数据方案"
            description="数据库只有 0.5GB，首页阶段不接真实书库。后续数据库只存用户、行为、精选书单和实验结果摘要，大批量书籍元数据与向量文件都放到库外。"
          />
          <PlanCard
            icon={<Download className="size-5" />}
            title="验证方案"
            description="推荐算法验证不依赖线上书城数据。后续直接下载公开数据集到本地 `data/` 目录做离线实验，再把指标和少量样例结果回写到系统里。"
          />
          <PlanCard
            icon={<BrainCircuit className="size-5" />}
            title="算法路线"
            description="推荐链路先按 Embedding Recall + Qwen Rerank 设计，后面再接你的自研 rerank 和传统 baseline，但这部分不占首页主视觉。"
          />
          <PlanCard
            icon={<Sparkles className="size-5" />}
            title="下一步"
            description="如果这版书城布局方向对，就继续做真实分类页、图书详情页和搜索结果页；推荐实验页单独拆到 `/lab`，不污染书城观感。"
          />
        </section>
      </div>
    </main>
  );
}

function Ribbon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`absolute rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

function PlanCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <Card className="rounded-[28px] border-border/70 bg-card/86">
      <CardHeader>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <CardTitle className="mt-3 font-display text-3xl">{title}</CardTitle>
        <CardDescription className="text-sm leading-7 text-muted-foreground">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
