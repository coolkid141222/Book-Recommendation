import { type ReactNode, useEffect, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  BookOpen,
  Layers3,
  Search,
  ShoppingCart,
  Star,
  TrendingUp
} from "lucide-react";

import { fetchBooks, fetchModelEffect, type Book, type ModelEffectResponse } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Category = "全部" | "文学" | "科幻" | "推理" | "奇幻" | "经管" | "历史";

type PlaceholderBook = {
  id: string;
  title: string;
  author: string;
  category: Exclude<Category, "全部">;
  rawGenres?: string[];
  badge?: string;
  discount?: string;
  price: string;
  originalPrice?: string;
  rating: number;
  ratingCount: number;
  coverClassName: string;
  accentClassName: string;
  coverUrl?: string | null;
};

const categories: Category[] = ["全部", "文学", "科幻", "推理", "奇幻", "经管", "历史"];
const datasetCategoryCycle: Exclude<Category, "全部">[] = ["文学", "科幻", "推理", "奇幻", "经管", "历史"];

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

function normalizeAuthorDisplay(value: string) {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return trimmed;
  }

  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return trimmed;
  }

  return content
    .replace(/^'/, "")
    .replace(/'$/, "")
    .split(/',\s*'/)
    .map((item) => item.replace(/\\'/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" / ");
}

function parseListValue(value?: string | null) {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return [trimmed];
  }

  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return [];
  }

  return content
    .replace(/^'/, "")
    .replace(/'$/, "")
    .split(/',\s*'/)
    .map((item) => item.replace(/\\'/g, "'").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeCategory(value?: string | null): Exclude<Category, "全部"> {
  if (value && categories.includes(value as Category) && value !== "全部") {
    return value as Exclude<Category, "全部">;
  }

  return "文学";
}

function mapApiBookToPlaceholder(book: Book, index: number): PlaceholderBook {
  const category = book.category
    ? normalizeCategory(book.category)
    : datasetCategoryCycle[index % datasetCategoryCycle.length];
  const averageRating = Number(book.averageRating);
  const ratingsCount = Number(book.ratingsCount);

  return {
    id: book.id,
    title: book.title,
    author: normalizeAuthorDisplay(book.author),
    category,
    rawGenres: parseListValue(book.rawGenres).slice(0, 3),
    badge: Number.isFinite(ratingsCount) && ratingsCount > 150000 ? "热销" : index % 3 === 0 ? "推荐" : undefined,
    discount: index % 4 === 0 ? `-${18 + (index % 5) * 3}%` : undefined,
    price: `${36 + (index % 6) * 4}.00`,
    originalPrice: `${52 + (index % 6) * 5}.00`,
    rating: Number.isFinite(averageRating) ? averageRating : 4 + (index % 2),
    ratingCount: Number.isFinite(ratingsCount) ? ratingsCount : 1000 + index * 137,
    coverClassName: books[index % books.length].coverClassName,
    accentClassName: books[index % books.length].accentClassName,
    coverUrl: book.coverUrl || book.smallCoverUrl || null
  };
}

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("全部");
  const [keyword, setKeyword] = useState("");
  const [shelf, setShelf] = useState<string[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<PlaceholderBook[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "fallback">("loading");
  const [modelEffect, setModelEffect] = useState<ModelEffectResponse | null>(null);
  const [modelEffectState, setModelEffectState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let active = true;

    async function loadData() {
      const [booksResult, modelEffectResult] = await Promise.allSettled([fetchBooks(), fetchModelEffect()]);
      if (!active) {
        return;
      }

      if (booksResult.status === "fulfilled" && booksResult.value.length) {
        setCatalogBooks(booksResult.value.map(mapApiBookToPlaceholder));
        setCatalogState("ready");
      } else {
        setCatalogBooks([]);
        setCatalogState("fallback");
      }

      if (modelEffectResult.status === "fulfilled") {
        setModelEffect(modelEffectResult.value);
        setModelEffectState("ready");
      } else {
        setModelEffect(null);
        setModelEffectState("fallback");
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const sourceBooks = catalogState === "ready" ? catalogBooks : books;
  const hasDatasetBooks = catalogState === "ready";

  const filteredBooks = sourceBooks.filter((book) => {
    const categoryMatch = selectedCategory === "全部" || book.category === selectedCategory;
    const keywordMatch =
      keyword.trim() === "" ||
      book.title.toLowerCase().includes(keyword.toLowerCase()) ||
      book.author.toLowerCase().includes(keyword.toLowerCase());

    return categoryMatch && keywordMatch;
  });
  const topGenreLabels = Array.from(new Set(filteredBooks.flatMap((book) => book.rawGenres || []))).slice(0, 8);

  function toggleShelf(bookId: string) {
    setShelf((current) => (current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId]));
  }

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
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4 text-muted-foreground">
                <Search className="size-4" />
              </div>
              <Input
                className="h-12 rounded-2xl border-border/70 bg-background/88 pl-11 pr-4"
                placeholder="搜索书籍、作者..."
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>

            <Button variant="ghost" className="relative size-11 rounded-2xl p-0 text-foreground">
              <ShoppingCart className="size-5" />
              {shelf.length ? (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                  {shelf.length}
                </span>
              ) : null}
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
              <p className="text-2xl font-semibold tracking-tight">
                {catalogState === "loading" ? "正在同步书目..." : `找到 ${filteredBooks.length} 本书籍`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {catalogState === "loading"
                  ? "正在从 Goodbooks 数据集加载书目、封面和评分信息。"
                  : hasDatasetBooks
                  ? "当前展示来自 Goodbooks 数据集导入的样本书目，封面、评分和交互记录已接入。"
                  : "当前为占位书卡，接口未返回数据时会自动回退到这组视觉样本。"}
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {catalogState === "loading" ? "Data Syncing" : hasDatasetBooks ? "Goodbooks Sample" : "0.5GB DB Friendly"}
            </Badge>
          </div>

          <ModelEffectPanel state={modelEffectState} modelEffect={modelEffect} topGenreLabels={topGenreLabels} />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBooks.map((book) => (
              <Card
                key={book.id}
                className="overflow-hidden rounded-[24px] border border-border/70 bg-background/92 shadow-[0_22px_50px_-36px_rgba(27,52,64,0.22)] transition-transform duration-200 hover:-translate-y-1"
              >
                <CardContent className="p-0">
                  <div className={`relative h-80 overflow-hidden border-b border-border/60 ${book.coverClassName}`}>
                    {book.badge ? <Ribbon className="left-3 top-3 bg-[#ef4444] text-white">{book.badge}</Ribbon> : null}
                    {book.discount ? <Ribbon className="right-3 top-3 bg-[#f97316] text-white">{book.discount}</Ribbon> : null}

                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}

                    <div className="absolute inset-0 flex items-end p-5">
                      <div className={`rounded-[24px] border border-white/16 bg-black/10 p-5 backdrop-blur-[2px] ${book.accentClassName}`}>
                        <p className="text-xs uppercase tracking-[0.28em] opacity-75">{book.coverUrl ? "Book Cover" : "Placeholder Cover"}</p>
                        <p className="mt-4 font-display text-3xl leading-tight">{book.title}</p>
                        <p className="mt-2 text-sm opacity-80">{book.author}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div>
                      <h2 className="text-2xl font-semibold leading-tight">{book.title}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{book.author}</p>
                      {book.rawGenres?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {book.rawGenres.slice(0, 2).map((genre) => (
                            <Badge key={`${book.id}-${genre}`} variant="outline" className="rounded-full bg-secondary/60">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1 text-[#f5b301]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-4 ${index < Math.round(book.rating) ? "fill-current" : "text-[#d9d9d9]"}`}
                        />
                      ))}
                      <span className="ml-1 text-sm text-muted-foreground">
                        {book.rating.toFixed(1)} ({book.ratingCount.toLocaleString()})
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-semibold">¥{book.price}</span>
                        {book.originalPrice ? <span className="pb-1 text-sm text-muted-foreground line-through">¥{book.originalPrice}</span> : null}
                      </div>
                      <Button
                        className="size-11 rounded-2xl p-0"
                        onClick={() => toggleShelf(book.id)}
                        variant={shelf.includes(book.id) ? "secondary" : "default"}
                      >
                        <ShoppingCart className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

function ModelEffectPanel({
  state,
  modelEffect,
  topGenreLabels
}: {
  state: "loading" | "ready" | "fallback";
  modelEffect: ModelEffectResponse | null;
  topGenreLabels: string[];
}) {
  if (state === "loading") {
    return (
      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-border/60 bg-background/84 p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-4 h-10 w-24" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!modelEffect) {
    return (
      <div className="mt-6 rounded-[24px] border border-border/60 bg-background/84 p-5 text-sm text-muted-foreground">
        模型效果面板暂不可用，书城仍可继续浏览。等模型接口或数据库状态恢复后，这里会展示当前引擎、事件分布和运行指标。
      </div>
    );
  }

  const { model, pipeline, runtimeMetrics, eventMix, categoryMix } = modelEffect;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<BrainCircuit className="size-4" />}
        label="当前引擎"
        value={pipeline.mode === "semantic-ready" ? "向量召回已启用" : "当前走 fallback"}
        description={`${model.embedding.provider}:${model.embedding.model} · ${model.rerank.provider}:${model.rerank.model}`}
      >
        <div className="flex flex-wrap gap-2">
          <MetricChip label="Embedding" value={`${Math.round(pipeline.embeddingCoverage * 100)}%`} />
          <MetricChip label="维度" value={String(model.embedding.dimensions || 0)} />
        </div>
      </MetricCard>

      <MetricCard
        icon={<Layers3 className="size-4" />}
        label="数据规模"
        value={`${pipeline.bookCount.toLocaleString()} 本书`}
        description={`${pipeline.eventCount.toLocaleString()} 条隐式行为 · ${pipeline.userCount.toLocaleString()} 位用户`}
      >
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <span>真实分类 {pipeline.categoryCount}</span>
          <span>人均事件 {pipeline.avgEventsPerUser}</span>
        </div>
      </MetricCard>

      <MetricCard
        icon={<TrendingUp className="size-4" />}
        label="行为信号"
        value={`借阅占比 ${formatPercent(runtimeMetrics.borrowShare)}`}
        description={`点击占比 ${formatPercent(runtimeMetrics.clickShare)} · 收藏占比 ${formatPercent(runtimeMetrics.favoriteShare)}`}
      >
        <div className="space-y-2">
          {eventMix.slice(0, 4).map((item) => (
            <SignalBar key={item.eventType} label={translateEventType(item.eventType)} count={item.count} share={item.share} />
          ))}
        </div>
      </MetricCard>

      <MetricCard
        icon={<BarChart3 className="size-4" />}
        label="真实类别"
        value={categoryMix.length ? categoryMix.map((item) => item.category).join(" / ") : "未导入"}
        description={`平均书籍评分 ${pipeline.averageBookRating.toFixed(2)} · 保留原始 genres 标签`}
      >
        <div className="flex flex-wrap gap-2">
          {topGenreLabels.slice(0, 6).map((genre) => (
            <Badge key={genre} variant="outline" className="rounded-full bg-secondary/50">
              {genre}
            </Badge>
          ))}
        </div>
      </MetricCard>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  children
}: {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/84 p-4 shadow-[0_16px_34px_-28px_rgba(27,52,64,0.28)]">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-4 text-lg font-semibold leading-snug">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      {children ? (
        <>
          <Separator className="my-4" />
          {children}
        </>
      ) : null}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
      {label} {value}
    </span>
  );
}

function SignalBar({ label, count, share }: { label: string; count: number; share: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {count.toLocaleString()} · {formatPercent(share)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary/80">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(share * 100, 6)}%` }} />
      </div>
    </div>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function translateEventType(eventType: string) {
  switch (eventType) {
    case "view":
      return "浏览";
    case "click":
      return "点击";
    case "borrow":
      return "借阅";
    case "favorite":
      return "收藏";
    case "add_to_shelf":
      return "加入书架";
    default:
      return eventType;
  }
}

function Ribbon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`absolute rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}
