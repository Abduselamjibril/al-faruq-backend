import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards, // <-- Import UseGuards
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // <-- Import the guard
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@Controller('feed')
@UseGuards(JwtAuthGuard) // <-- PROTECT THE ENTIRE CONTROLLER
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Endpoint for the mobile app's main screen.
   * Fetches a list of all top-level content.
   * This route is now protected and requires a valid JWT.
   */
  @Get()
  getFeed() {
    return this.feedService.getFeed();
  }

  /**
   * Endpoint for the mobile app's content detail screen.
   * This route is now protected and requires a valid JWT.
   * The JwtAuthGuard will add the 'user' object to the request.
   */
  @Get(':id')
  getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: number },
  ) {
     // We can now remove the manual check because the guard handles it.
     // If the code reaches this point, 'user' is guaranteed to exist.
     // if (!user || !user.id) {
     //  throw new Error('User information is missing...');
     // }
    return this.feedService.getContentForUser(id, user.id);
  }
}