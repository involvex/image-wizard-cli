import sys

# Debug output BEFORE any other imports
print("[DEBUG] Python script starting!", file=sys.stderr, flush=True)

import argparse
import os
import re
import time
from urllib.parse import quote

print("[DEBUG] Before httpx import", file=sys.stderr, flush=True)
import aiofiles
import httpx

print("[DEBUG] After httpx import", file=sys.stderr, flush=True)


class ImageGenerator:
    """
    Synchronous AI Image Creator by Microsoft Bing Image Creator (https://bing.com/images/create/).
    :param auth_cookie_u: Your https://bing.com/ _U auth cookie.
    :param auth_cookie_srchhpgusr: Your https://bing.com/ SRCHHPGUSR auth cookie.
    :param logging_enabled: Identifies whether logging is enabled or not.
    """

    def __init__(
        self,
        auth_cookie_u: str,
        auth_cookie_srchhpgusr: str,
        logging_enabled: bool = True,
    ):
        # Setting up httpx client with realistic browser headers
        self.client: httpx.Client = httpx.Client(
            cookies={"_U": auth_cookie_u, "SRCHHPGUSR": auth_cookie_srchhpgusr},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
            },
        )

        # Setting up logging
        self.logging_enabled = logging_enabled

    def __log(self, message: str):
        if self.logging_enabled:
            print(message)

    def generate(self, prompt: str, num_images: int) -> list:
        """
        Generates AI images from a prompt.
        :param prompt: Description of image you want to generate.
        :param num_images: Number of images to generate.
        :return: List of generated image URLs.
        """
        import sys

        print(
            f"[DEBUG] generate() called with prompt: {prompt[:50]}..., num_images: {num_images}",
            file=sys.stderr,
            flush=True,
        )

        images = []
        cycle = 0
        start = time.time()

        while len(images) < num_images:
            cycle += 1

            # First, GET the images/create page to establish session (like a real browser)
            self.__log(f"🔗 Establishing session... (cycle: {cycle})")
            get_response = self.client.get(
                url="https://www.bing.com/images/create",
                timeout=30,
            )
            self.__log(f"✅ Session established, status: {get_response.status_code}")

            # Sending request to https://bing.com/
            encoded_prompt = quote(prompt, safe="")
            response = self.client.post(
                url=f"https://www.bing.com/images/create?q={encoded_prompt}&rt=3&FORM=GENCRE",
                data={"q": prompt, "qs": "ds"},
                follow_redirects=False,
                timeout=200,
            )

            # Validating that request succeeded
            if response.status_code != 302:
                import sys

                print(
                    f"[DEBUG] Status code: {response.status_code}",
                    file=sys.stderr,
                    flush=True,
                )
                print(
                    f"[DEBUG] Response headers: {dict(response.headers)}",
                    file=sys.stderr,
                    flush=True,
                )
                print(
                    f"[DEBUG] Response text (first 1000 chars): {response.text[:1000]}",
                    file=sys.stderr,
                    flush=True,
                )
                raise Exception(
                    f"🛑 Request to https://bing.com/ failed! (Redirect) - Status: {response.status_code}"
                )

            self.__log(f"✅ Request to https://bing.com/ sent! (cycle: {cycle})")

            # Verify that response does not contain errors
            if "being reviewed" in response.text or "has been blocked" in response.text:
                raise Exception("🛑 Prompt is being reviewed or blocked!")
            if "image creator in more languages" in response.text:
                raise Exception("🛑 Language is not supported by Bing yet!")

            # Get redirect url
            import sys

            print(
                f"[DEBUG] Location header: {response.headers.get('Location')}",
                file=sys.stderr,
                flush=True,
            )
            if "Location" not in response.headers:
                raise Exception("🛑 No Location header in response!")
            result_id = (
                response.headers["Location"].replace("&nfy=1", "").split("id=")[-1]
            )
            print(f"[DEBUG] Result ID: {result_id}", file=sys.stderr, flush=True)
            results_url = f"https://www.bing.com/images/create/async/results/{result_id}?q={encoded_prompt}"
            print(f"[DEBUG] Results URL: {results_url}", file=sys.stderr, flush=True)

            # Wait for results
            self.__log(f"🕗 Awaiting generation... (cycle: {cycle})")
            start_time = time.time()
            poll_count = 0
            while True:
                poll_count += 1
                response = self.client.get(results_url)
                import sys

                if poll_count % 5 == 0:  # Log every 5 seconds
                    print(
                        f"[DEBUG] Polling... ({poll_count}s) Status: {response.status_code}, Text length: {len(response.text)}",
                        file=sys.stderr,
                        flush=True,
                    )
                    if response.text:
                        print(
                            f"[DEBUG] Response preview: {response.text[:500]}",
                            file=sys.stderr,
                            flush=True,
                        )

                if time.time() - start_time > 300:  # Increased timeout to 300 seconds
                    print(
                        f"[DEBUG] Timeout! Final response: {response.text[:1000] if response.text else '(empty)'}",
                        file=sys.stderr,
                        flush=True,
                    )
                    print(
                        "🛑 Waiting for results timed out!", file=sys.stderr, flush=True
                    )
                    sys.exit(2)

                if response.status_code != 200:
                    raise Exception(
                        "🛑 Exception happened while waiting for image generation! (NoResults)"
                    )

                # Check if we have a valid response
                if response.text and "errorMessage" not in response.text:
                    # Also check for the new Bing response format
                    if len(response.text) > 100:  # Substantial response
                        print(
                            f"[DEBUG] Got results after {poll_count} seconds!",
                            file=sys.stderr,
                            flush=True,
                        )
                        print(
                            f"[DEBUG] Response text length: {len(response.text)}",
                            file=sys.stderr,
                            flush=True,
                        )
                        print(
                            f"[DEBUG] Response text (first 2000 chars): {response.text[:2000]}",
                            file=sys.stderr,
                            flush=True,
                        )
                        break

                time.sleep(1)

            # Find and return image links
            print(
                f"[DEBUG] Trying to find image links in response...",
                file=sys.stderr,
                flush=True,
            )
            new_images = [
                "https://tse" + link.split("?w=")[0]
                for link in re.findall('src="https://tse([^"]+)"', response.text)
            ]
            print(
                f"[DEBUG] Found {len(new_images)} images in this cycle",
                file=sys.stderr,
                flush=True,
            )
            if len(new_images) == 0:
                print(
                    f"[DEBUG] No images found. Response contains 'img' tags: {'<img' in response.text}",
                    file=sys.stderr,
                    flush=True,
                )
                print(
                    f"[DEBUG] Response contains 'error': {'error' in response.text.lower()}",
                    file=sys.stderr,
                    flush=True,
                )
                raise Exception(
                    f"🛑 No new images were generated for this cycle. Response: {response.text[:500]}"
                )
            images += new_images
            self.__log(
                f"✅ Successfully finished cycle {cycle} in {round(time.time() - start_time, 2)} seconds"
            )

        self.__log(
            f"✅ Finished generating {num_images} images in {round(time.time() - start, 2)} seconds and {cycle} cycles"
        )
        return images[:num_images]

    def save(self, images: list, output_dir: str) -> None:
        """
        Saves generated images to a folder.
        :param images: List of generated image URLs.
        :param output_dir: Directory where to save generated images.
        """

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        for images in images:
            response = self.client.get(images)
            if response.status_code != 200:
                raise Exception(
                    "🛑 Exception happened while saving image! (Response was not ok)"
                )

            # Sanitize filename: strip query string and invalid characters
            raw_id = images.split("/id/")[1]
            raw_id = raw_id.split("?")[0]
            filename = f"{raw_id}.jpeg"
            # Remove any characters invalid for Windows filenames
            import re as _re

            filename = _re.sub(r'[<>:"/\\|?*]', "_", filename)
            with open(os.path.join(output_dir, filename), "wb") as f:
                f.write(response.content)
                f.close()

            self.__log(f"✅ Saved image {filename}!")


class AsyncImageGenerator:
    """
    Asynchronous AI Image Creator by Microsoft Bing Image Creator (https://bing.com/images/create/).
    :param auth_cookie_u: Your https://bing.com/ _U auth cookie.
    :param auth_cookie_srchhpgusr: Your https://bing.com/ SRCHHPGUSR auth cookie.
    :param logging_enabled: Identifies whether logging is enabled or not.
    """

    def __init__(
        self,
        auth_cookie_u: str,
        auth_cookie_srchhpgusr: str,
        logging_enabled: bool = True,
    ):
        # Setting up httpx client with realistic browser headers
        self.client: httpx.AsyncClient = httpx.AsyncClient(
            cookies={"_U": auth_cookie_u, "SRCHHPGUSR": auth_cookie_srchhpgusr},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
            },
        )

        # Setting up logging
        self.logging_enabled = logging_enabled

    def __log(self, message: str):
        if self.logging_enabled:
            print(message)

    async def generate(self, prompt: str, num_images: int) -> list:
        """
        Generates AI images from a prompt.
        :param prompt: Description of image you want to generate.
        :param num_images: Number of images to generate.
        :return: List of generated image URLs.
        """

        images = []
        cycle = 0
        start = time.time()

        while len(images) < num_images:
            cycle += 1

            # Sending request to https://bing.com/
            encoded_prompt = quote(prompt, safe="")
            response = await self.client.post(
                url=f"https://www.bing.com/images/create?q={encoded_prompt}&rt=3&FORM=GENCRE",
                data={"q": prompt, "qs": "ds"},
                follow_redirects=False,
                timeout=200,
            )

            # Validating that request succeeded
            if response.status_code != 302:
                raise Exception("🛑 Request to https://bing.com/ failed! (Redirect)")

            self.__log(f"✅ Request to https://bing.com/ sent! (cycle: {cycle})")

            # Verify that response does not contain errors
            if "being reviewed" in response.text or "has been blocked" in response.text:
                raise Exception("🛑 Prompt is being reviewed or blocked!")
            if "image creator in more languages" in response.text:
                raise Exception("🛑 Language is not supported by Bing yet!")

            # Get redirect url
            result_id = (
                response.headers["Location"].replace("&nfy=1", "").split("id=")[-1]
            )
            results_url = f"https://www.bing.com/images/create/async/results/{result_id}?q={encoded_prompt}"

            # Wait for results
            self.__log(f"🕗 Awaiting generation... (cycle: {cycle})")
            start_time = time.time()
            while True:
                response = await self.client.get(results_url)

                if time.time() - start_time > 300:
                    print(
                        "🛑 Waiting for results timed out!", file=sys.stderr, flush=True
                    )
                    sys.exit(2)

                if response.status_code != 200:
                    raise Exception(
                        "🛑 Exception happened while waiting for image generation! (NoResults)"
                    )

                if not response.text or response.text.find("errorMessage") != -1:
                    time.sleep(1)
                    continue
                else:
                    break

            # Find and return image links
            new_images = [
                "https://tse" + link.split("?w=")[0]
                for link in re.findall('src="https://tse([^"]+)"', response.text)
            ]
            if len(new_images) == 0:
                raise Exception(
                    "🛑 No new images were generated for this cycle, please check your prompt"
                )
            self.__log(
                f"✅ Successfully finished cycle {cycle} in {round(time.time() - start_time, 2)} seconds"
            )

        self.__log(
            f"✅ Finished generating {num_images} images in {round(time.time() - start, 2)} seconds and {cycle} cycles"
        )
        return images[:num_images]

    async def save(self, images: list, output_dir: str) -> None:
        """
        Saves generated images to a folder.
        :param images: List of generated image URLs.
        :param output_dir: Directory where to save generated images.
        """

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        for images in images:
            response = await self.client.get(images)
            if response.status_code != 200:
                raise Exception(
                    "🛑 Exception happened while saving image! (Response was not ok)"
                )

            raw_id = images.split("/id/")[1].split("?")[0]
            import re as _re

            filename = _re.sub(r'[<>:"/\\|?*]', "_", raw_id) + ".jpeg"
            async with aiofiles.open(os.path.join(output_dir, filename), "wb") as f:
                await f.write(response.content)
                await f.close()

            self.__log(f"✅ Saved image {filename}!")


def main():
    import sys

    print("[DEBUG] main() called!", file=sys.stderr, flush=True)
    parser = argparse.ArgumentParser(
        prog="Bing Create",
        description="A simple lightweight AI Image Generator from text description using Bing Image Creator (DALL-E 3)",
        epilog="Made by Waenara ^^",
    )

    parser.add_argument(
        "--u", help="Your _U cookie from https://bing.com/", required=True
    )

    parser.add_argument(
        "--s", help="Your SRCHHPGUSR cookie from https://bing.com/", required=True
    )

    parser.add_argument(
        "--prompt", help="Description of image to generate", required=True
    )

    parser.add_argument(
        "--number", help="How many images to generate. Default: 4", type=int, default=4
    )

    parser.add_argument(
        "--output",
        help="Directory where to save generated images. If not specified you will just get links printed out",
    )

    parser.add_argument(
        "--quiet", help="If present logging is disabled", action="store_true"
    )

    args = parser.parse_args()
    generator = ImageGenerator(args.u, args.s, not args.quiet)
    generated_images = generator.generate(args.prompt, args.number)

    if args.output:
        generator.save(generated_images, args.output)
    else:
        for generated_image in generated_images:
            print(f"🖼 {generated_image}")


if __name__ == "__main__":
    main()
