import Storefront from "../components/storefront";
import content from "../data/content.json";

export default function Page() {
  return <Storefront content={content} />;
}
