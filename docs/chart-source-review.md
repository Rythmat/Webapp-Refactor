# Chart review — what the prop book says and the library does not

Read from the 647 source PDFs. 627 of 640 songs matched a chart.

**What I read:** printed measure numbers, time signatures, repeat dots,
1st/2nd endings, ×N counts, Fine, and written cues.

**What I did not read, on purpose:** chord symbols (the book is not reliable
about them — that needs your ear), section letters (the book uses A/B/C and
the library uses named sections), and the whole bass-notation layer.

**Bar counts are exact.** They are the engraver’s own printed measure numbers,
lifted from the font he used for nothing else.

**Bar numbers for individual marks are approximate.** They come from where a
mark sits across a system, so they point at the right place rather than measure
it. Expect to be a bar out either way.

**A time signature is read as one digit sitting above another**, which is what
one looks like on a page. That is reliable for a clear 5/4 or 7/4 and it can
also pick up a coincidence — two unrelated digits that happen to line up. Where
a row below claims a metre that surprises you, it is likelier to be my mistake
than the book’s. Deleting a row is a perfectly good answer.

---

## 1. Mixed metre — 53 songs the library cannot currently hold

`ChordBar` has no time signature, so every one of these was flattened on the
way in. This is the list that justifies adding one.

| Song                                                            | Library | Page shows          | Changes at (bar: metre)                                                                                                                           | Your answer |
| --------------------------------------------------------------- | ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Contusion (`contusion`)                                         | 4/4     | 5/4 4/4 2/4 3/8 3/4 | 3: 5/4, 6: 4/4, 11: 2/4, 12: 3/8, 15: 4/4, 29: 2/4, 30: 3/8, 33: 4/4, 47: 2/4, 48: 3/8, 51: 4/4, 55: 3/4                                          |             |
| Blackbird (`blackbird`)                                         | 3/4     | 3/4 4/4 6/4 2/4     | 1: 3/4, 2: 4/4, 3: 3/4, 4: 4/4, 6: 6/4, 9: 4/4, 10: 6/4, 11: 3/4, 13: 6/4, 18: 2/4, 20: 6/4, 22: 3/4, 23: 4/4, 27: 3/4, 29: 4/4, 31: 6/4, 33: 4/4 |             |
| Here Comes The Sun (`here_comes_the_sun`)                       | 4/4     | 2/4 3/8 5/8 4/4     | 47: 2/4, 48: 3/8, 49: 2/4, 50: 3/8, 54: 5/8, 55: 4/4                                                                                              |             |
| Across The Universe (`across_the_universe`)                     | 4/4     | 5/4 4/4 2/4         | 6: 5/4, 7: 4/4, 10: 2/4, 11: 4/4, 30: 5/4, 31: 4/4, 44: 2/4, 45: 4/4                                                                              |             |
| Changes (`changes`)                                             | 4/4     | 4/4 2/4 3/4         | 1: 4/4, 30: 2/4, 35: 3/4, 38: 4/4, 53: 2/4, 59: 3/4, 61: 4/4                                                                                      |             |
| I Love Rock ‘N’ Roll (`i_love_rock_n_roll`)                     | 4/4     | 4/4 3/4 6/4         | 1: 4/4, 3: 3/4, 5: 4/4, 13: 6/4, 14: 4/4, 19: 3/4, 30: 6/4, 31: 4/4, 40: 3/4                                                                      |             |
| Living For The City (`living_for_the_city`)                     | 4/4     | 4/4 3/4 2/4         | 1: 4/4, 17: 3/4, 22: 2/4, 23: 4/4, 40: 3/4, 45: 2/4, 46: 4/4, 53: 3/4, 59: 2/4, 79: 4/4, 82: 3/4                                                  |             |
| Oh! You Pretty Things (`oh_you_pretty_things`)                  | 4/4     | 3/4 2/4 4/4         | 3: 3/4, 17: 2/4, 18: 4/4, 38: 3/4                                                                                                                 |             |
| Africa (`africa`)                                               | 4/4     | 4/4 2/4             | 1: 4/4, 11: 2/4, 12: 4/4, 18: 2/4, 39: 4/4, 62: 2/4                                                                                               |             |
| All Night Long (`all_night_long`)                               | 4/4     | 4/4 6/4             | 12: 4/4, 33: 6/4, 35: 4/4                                                                                                                         |             |
| Angel From Montgomery (`angel_from_montgomery`)                 | 4/4     | 4/4 3/4             | 1: 4/4, 12: 3/4, 14: 4/4, 20: 3/4, 21: 4/4, 28: 3/4, 29: 4/4, 34: 3/4, 38: 4/4                                                                    |             |
| Black Dog (`black_dog`)                                         | 4/4     | 4/4 2/4             | 1: 4/4, 24: 2/4                                                                                                                                   |             |
| Black Hole Sun (`black_hole_sun`)                               | 4/4     | 4/4 2/4             | 1: 4/4, 10: 2/4, 25: 4/4, 26: 2/4, 29: 4/4, 30: 2/4, 32: 4/4, 33: 2/4, 47: 4/4, 48: 2/4, 51: 4/4                                                  |             |
| Change The World (`change_the_world`)                           | 4/4     | 4/4 6/4             | 1: 4/4, 61: 6/4, 63: 4/4                                                                                                                          |             |
| Cigarettes and Chocolate Milk (`cigarettes_and_chocolate_milk`) | 4/4     | 4/4 2/4             | 1: 4/4, 58: 2/4, 59: 4/4, 60: 2/4                                                                                                                 |             |
| Crazy Love (`crazy_love`)                                       | 4/4     | 2/4 4/4             | 19: 2/4, 20: 4/4                                                                                                                                  |             |
| Dear Prudence (`dear_prudence`)                                 | 4/4     | 2/4 4/4             | 31: 2/4, 32: 4/4                                                                                                                                  |             |
| Easy (`easy`)                                                   | 4/4     | 4/4 6/4             | 1: 4/4, 29: 6/4, 31: 4/4                                                                                                                          |             |
| Eventually (`eventually`)                                       | 4/4     | 4/4 6/4             | 1: 4/4, 37: 6/4, 38: 4/4                                                                                                                          |             |
| Fame (`fame`)                                                   | 4/4     | 3/4 4/4             | 2: 3/4, 3: 4/4, 27: 3/4, 29: 4/4                                                                                                                  |             |
| Hard Rock Cafe (`hard_rock_cafe`)                               | 4/4     | 4/4 6/4             | 1: 4/4, 60: 6/4                                                                                                                                   |             |
| Hey Jude (`hey_jude`)                                           | 4/4     | 2/4 4/4             | 24: 2/4, 28: 4/4                                                                                                                                  |             |
| Home (`home`)                                                   | 4/4     | 2/4 4/4             | 6: 2/4, 7: 4/4, 10: 2/4, 11: 4/4, 13: 2/4, 25: 4/4, 28: 2/4, 29: 4/4, 31: 2/4                                                                     |             |
| Homegrown (`homegrown`)                                         | 4/4     | 4/4 2/4             | 1: 4/4, 48: 2/4, 49: 4/4                                                                                                                          |             |
| I Want You Back (`i_want_you_back`)                             | 4/4     | 4/4 2/4             | 1: 4/4, 28: 2/4                                                                                                                                   |             |
| If It’s Magic (`if_its_magic`)                                  | 4/4     | 4/4 2/4             | 1: 4/4, 7: 2/4, 8: 4/4, 16: 2/4, 17: 4/4                                                                                                          |             |
| I’m Gonna Be (500 Miles) (`im_gonna_be_500_miles`)              | 4/4     | 4/4 6/4             | 2: 4/4, 45: 6/4, 49: 4/4                                                                                                                          |             |
| I’m Into Something Good (`im_into_something_good`)              | 4/4     | 4/4 2/4             | 1: 4/4, 24: 2/4, 27: 4/4                                                                                                                          |             |
| Interstate Love Song (`interstate_love_song`)                   | 4/4     | 4/4 2/4             | 1: 4/4, 13: 2/4                                                                                                                                   |             |
| Just Like A Woman (`just_like_a_woman`)                         | 4/4     | 4/4 2/4             | 1: 4/4, 22: 2/4, 23: 4/4, 51: 2/4                                                                                                                 |             |
| Just The Two Of Us (`just_the_two_of_us`)                       | 4/4     | 4/4 6/4             | 2: 4/4, 31: 6/4, 32: 4/4                                                                                                                          |             |
| Kashmir (`kashmir`)                                             | 4/4     | 9/8 4/4             | 5: 9/8, 7: 4/4                                                                                                                                    |             |
| Kiss From A Rose (`kiss_from_a_rose`)                           | 6/8     | 6/8 9/8             | 1: 6/8, 6: 9/8, 7: 6/8, 8: 9/8, 9: 6/8, 11: 9/8, 12: 6/8, 26: 9/8, 28: 6/8                                                                        |             |
| Livin’ On A Prayer (`livin_on_a_prayer`)                        | 4/4     | 3/4 4/4             | 56: 3/4, 57: 4/4                                                                                                                                  |             |
| Loving Cup (`loving_cup`)                                       | 4/4     | 4/4 5/4             | 1: 4/4, 15: 5/4, 18: 4/4, 19: 5/4, 21: 4/4, 39: 5/4, 42: 4/4, 43: 5/4, 44: 4/4                                                                    |             |
| Man, I Feel Like A Woman (`man_i_feel_like_a_woman`)            | 4/4     | 4/4 2/4             | 3: 4/4, 44: 2/4, 47: 4/4, 90: 2/4, 92: 4/4, 107: 2/4                                                                                              |             |
| Modern Love (`modern_love`)                                     | 4/4     | 6/4 4/4             | 1: 6/4, 8: 4/4                                                                                                                                    |             |
| Off The Wall (`off_the_wall`)                                   | 4/4     | 2/4 4/4             | 6: 2/4, 7: 4/4                                                                                                                                    |             |
| Paranoid Android (`paranoid_android`)                           | 4/4     | 4/4 7/8             | 1: 4/4, 27: 7/8, 31: 4/4, 33: 7/8, 38: 4/4, 44: 7/8, 46: 4/4, 51: 7/8, 55: 4/4, 76: 7/8, 80: 4/4, 84: 7/8, 88: 4/4                                |             |
| Pass The Peas (`pass_the_peas`)                                 | 4/4     | 4/4 2/4             | 1: 4/4, 17: 2/4, 18: 4/4                                                                                                                          |             |
| Pretty Woman (`pretty_woman`)                                   | 4/4     | 6/4 4/4             | 8: 6/4, 9: 4/4, 47: 6/4, 60: 4/4                                                                                                                  |             |
| Rich Girl (`rich_girl`)                                         | 4/4     | 2/4 4/4             | 6: 2/4, 7: 4/4                                                                                                                                    |             |
| Ring Of Fire (`ring_of_fire`)                                   | 4/4     | 2/4 4/4             | 2: 2/4, 3: 4/4, 7: 2/4, 13: 4/4, 27: 2/4, 28: 4/4, 43: 2/4, 44: 4/4, 48: 2/4, 49: 4/4, 51: 2/4, 52: 4/4                                           |             |
| Solsbury Hill (`solsbury_hill`)                                 | 7/4     | 4/4 7/4             | 11: 4/4, 12: 7/4, 22: 4/4                                                                                                                         |             |
| Space Oddity (`space_oddity`)                                   | 4/4     | 4/4 6/4             | 1: 4/4, 34: 6/4, 37: 4/4, 60: 6/4, 63: 4/4                                                                                                        |             |
| Take Me Home, Country Roads (`take_me_home_country_roads`)      | 4/4     | 4/4 2/4             | 1: 4/4, 5: 2/4, 6: 4/4                                                                                                                            |             |
| The Gambler (`the_gambler`)                                     | 4/4     | 4/4 2/4             | 1: 4/4, 19: 2/4, 20: 4/4, 36: 2/4, 38: 4/4                                                                                                        |             |
| The Man Who Sold The World (`the_man_who_sold_the_world`)       | 4/4     | 2/4 4/4             | 7: 2/4, 8: 4/4, 19: 2/4                                                                                                                           |             |
| The Ocean (`the_ocean`)                                         | 4/4     | 7/8 4/4             | 2: 7/8, 12: 4/4, 13: 7/8, 22: 4/4, 29: 7/8, 30: 4/4, 32: 7/8, 33: 4/4                                                                             |             |
| The Weight (`the_weight`)                                       | 4/4     | 4/4 3/4             | 1: 4/4, 16: 3/4                                                                                                                                   |             |
| Virtual Insanity (`virtual_insanity`)                           | 4/4     | 2/4 4/4             | 3: 2/4, 4: 4/4, 16: 2/4                                                                                                                           |             |
| You Don’t Know How It Feels (`you_dont_know_how_it_feels`)      | 4/4     | 4/4 2/4             | 1: 4/4, 20: 2/4, 31: 4/4, 48: 2/4                                                                                                                 |             |
| You’re My Best Friend (`youre_my_best_friend`)                  | 4/4     | 4/4 2/4             | 1: 4/4, 22: 2/4, 23: 4/4, 54: 2/4, 57: 4/4                                                                                                        |             |

## 2. Bars the library is missing — 90 songs

The page prints a measure number the library never reaches, so these bars
exist in the book and not in the data. The shortfall is a floor, not a guess.

| Song                                                                                | Library bars | Page proves at least | Short by | Your answer |
| ----------------------------------------------------------------------------------- | ------------ | -------------------- | -------- | ----------- |
| S.O.B. (`s_o_b`)                                                                    | 48           | 177                  | **129**  |             |
| Dog Days Are Over (`dog_days_are_over`)                                             | 48           | 97                   | **49**   |             |
| Wake Me Up (`wake_me_up`)                                                           | 29           | 77                   | **48**   |             |
| It Takes Two (`it_takes_two`)                                                       | 59           | 106                  | **47**   |             |
| Whole Lotta Love (`whole_lotta_love`)                                               | 51           | 86                   | **35**   |             |
| Honky Tonk Women (`honky_tonk_women`)                                               | 35           | 65                   | **30**   |             |
| I’m Yours (`im_yours`)                                                              | 21           | 50                   | **29**   |             |
| The Chain (`the_chain`)                                                             | 17           | 46                   | **29**   |             |
| Blank Space (`blank_space`)                                                         | 18           | 45                   | **27**   |             |
| Like A Prayer (`like_a_prayer`)                                                     | 52           | 78                   | **26**   |             |
| Get Lucky (`get_lucky`)                                                             | 101          | 125                  | **24**   |             |
| Bustin’ Loose (`bustin_loose`)                                                      | 58           | 81                   | **23**   |             |
| One Way Out (`one_way_out`)                                                         | 42           | 65                   | **23**   |             |
| Tightrope (`tightrope`)                                                             | 90           | 113                  | **23**   |             |
| Don't Stop Believin' (`dont_stop_believin`)                                         | 56           | 77                   | **21**   |             |
| Best Of My Love (`best_of_my_love`)                                                 | 12           | 32                   | **20**   |             |
| Chicken Fried (`chicken_fried`)                                                     | 75           | 94                   | **19**   |             |
| Dance With Me Tonight (`dance_with_me_tonight`)                                     | 56           | 73                   | **17**   |             |
| Hey Pocky A-Way (`hey_pocky_a_way`)                                                 | 61           | 77                   | **16**   |             |
| Can’t Stop The Feeling (`cant_stop_the_feeling`)                                    | 39           | 54                   | **15**   |             |
| Takin’ Care Of Business (`takin_care_of_business`)                                  | 31           | 45                   | **14**   |             |
| Any Man of Mine (`any_man_of_mine`)                                                 | 79           | 92                   | **13**   |             |
| I Gotta Feeling (`i_gotta_feeling`)                                                 | 32           | 45                   | **13**   |             |
| Royals (`royals`)                                                                   | 10           | 23                   | **13**   |             |
| You Gotta Be (`you_gotta_be`)                                                       | 26           | 39                   | **13**   |             |
| Even If It Breaks Your Heart (`even_if_it_breaks_your_heart`)                       | 59           | 71                   | **12**   |             |
| Havana (`havana`)                                                                   | 29           | 41                   | **12**   |             |
| Watermelon Sugar (`watermelon_sugar`)                                               | 33           | 45                   | **12**   |             |
| Let Me Clear My Throat (`let_me_clear_my_throat`)                                   | 36           | 47                   | **11**   |             |
| Cardova (`cardova`)                                                                 | 33           | 43                   | **10**   |             |
| Footloose (`footloose`)                                                             | 120          | 130                  | **10**   |             |
| Little Lion Man (`little_lion_man`)                                                 | 64           | 73                   | **9**    |             |
| Gimme Shelter (`gimme_shelter`)                                                     | 41           | 49                   | **8**    |             |
| Let’s Stay Together (`lets_stay_together`)                                          | 49           | 57                   | **8**    |             |
| Man, I Feel Like A Woman (`man_i_feel_like_a_woman`)                                | 103          | 111                  | **8**    |             |
| Thank You (Falettinme Be Mice Elf Again) (`thank_you_falettinme_be_mice_elf_again`) | 9            | 17                   | **8**    |             |
| Boogie On Reggae Woman (`boogie_on_reggae_woman`)                                   | 38           | 45                   | **7**    |             |
| Don’t Stop Me Now (`dont_stop_me_now`)                                              | 105          | 112                  | **7**    |             |
| Let The Music Take Your Mind (`let_the_music_take_your_mind`)                       | 20           | 27                   | **7**    |             |
| Old Time Rock And Roll (`old_time_rock_and_roll`)                                   | 18           | 25                   | **7**    |             |
| Take On Me (`take_on_me`)                                                           | 86           | 93                   | **7**    |             |
| Jump, Jive An’ Wail (`jump_jive_an_wail`)                                           | 41           | 47                   | **6**    |             |
| Lonely Boy (`lonely_boy`)                                                           | 43           | 49                   | **6**    |             |
| Mercy (`mercy`)                                                                     | 61           | 67                   | **6**    |             |
| Birthday (`birthday`)                                                               | 72           | 77                   | **5**    |             |
| Go Your Own Way (`go_your_own_way`)                                                 | 26           | 31                   | **5**    |             |
| All Day Sucker (`all_day_sucker`)                                                   | 60           | 64                   | **4**    |             |
| Cosmic Girl (`cosmic_girl`)                                                         | 41           | 45                   | **4**    |             |
| Fire On The Bayou (`fire_on_the_bayou`)                                             | 43           | 47                   | **4**    |             |
| Have You Ever Seen The Rain? (`have_you_ever_seen_the_rain`)                        | 35           | 39                   | **4**    |             |
| I Heard It Through The Grapevine (`i_heard_it_through_the_grapevine`)               | 55           | 59                   | **4**    |             |
| Just Kissed My Baby (`just_kissed_my_baby`)                                         | 37           | 41                   | **4**    |             |
| Play That Funky Music (`play_that_funky_music`)                                     | 45           | 49                   | **4**    |             |
| Shakey Ground (`shakey_ground`)                                                     | 25           | 29                   | **4**    |             |
| Ain’t Too Proud To Beg (`aint_too_proud_to_beg`)                                    | 38           | 41                   | **3**    |             |
| Dance With My Daughter (`dance_with_my_daughter`)                                   | 40           | 43                   | **3**    |             |
| Ignition (Remix) (`ignition_remix`)                                                 | 17           | 20                   | **3**    |             |
| Jungle Boogie (`jungle_boogie`)                                                     | 34           | 37                   | **3**    |             |
| Le Freak (`le_freak`)                                                               | 39           | 42                   | **3**    |             |
| Loving Cup (`loving_cup`)                                                           | 43           | 46                   | **3**    |             |
| Sunday Morning (`sunday_morning`)                                                   | 122          | 125                  | **3**    |             |
| Uptown Funk (`uptown_funk`)                                                         | 62           | 65                   | **3**    |             |
| Angel From Montgomery (`angel_from_montgomery`)                                     | 40           | 42                   | **2**    |             |
| Five Years (`five_years`)                                                           | 51           | 53                   | **2**    |             |
| Let’s Hear It For The Boy (`lets_hear_it_for_the_boy`)                              | 47           | 49                   | **2**    |             |
| Modern Love (`modern_love`)                                                         | 67           | 69                   | **2**    |             |
| Mony Mony (`mony_mony`)                                                             | 78           | 80                   | **2**    |             |
| Subterranean Homesick Alien (`subterranean_homesick_alien`)                         | 76           | 78                   | **2**    |             |
| (They Long To Be) Close To You (`they_long_to_be_close_to_you`)                     | 57           | 59                   | **2**    |             |
| American Girl (`american_girl`)                                                     | 50           | 51                   | **1**    |             |
| Everybody Wants To Rule The World (`everybody_wants_to_rule_the_world`)             | 58           | 59                   | **1**    |             |
| Fire And Rain (`fire_and_rain`)                                                     | 21           | 22                   | **1**    |             |
| Forget You (`forget_you`)                                                           | 57           | 58                   | **1**    |             |
| Friend of the Devil (`friend_of_the_devil`)                                         | 94           | 95                   | **1**    |             |
| Geronimo (`geronimo`)                                                               | 62           | 63                   | **1**    |             |
| Jesus Etc. (`jesus_etc`)                                                            | 68           | 69                   | **1**    |             |
| Let’s Go Crazy (`lets_go_crazy`)                                                    | 65           | 66                   | **1**    |             |
| Life Is A Highway (`life_is_a_highway`)                                             | 58           | 59                   | **1**    |             |
| Long Train Running (`long_train_running`)                                           | 59           | 60                   | **1**    |             |
| My Type (`my_type`)                                                                 | 70           | 71                   | **1**    |             |
| Pretty Woman (`pretty_woman`)                                                       | 62           | 63                   | **1**    |             |
| Redneck Woman (`redneck_woman`)                                                     | 49           | 50                   | **1**    |             |
| Shake It Off (`shake_it_off`)                                                       | 27           | 28                   | **1**    |             |
| Shut Up And Dance (`shut_up_and_dance`)                                             | 64           | 65                   | **1**    |             |
| The Gambler (`the_gambler`)                                                         | 67           | 68                   | **1**    |             |
| The Love Shack (`the_love_shack`)                                                   | 39           | 40                   | **1**    |             |
| This Is How We Do It (`this_is_how_we_do_it`)                                       | 20           | 21                   | **1**    |             |
| Try A Little Tenderness (`try_a_little_tenderness`)                                 | 38           | 39                   | **1**    |             |
| Will You Be There (`will_you_be_there`)                                             | 30           | 31                   | **1**    |             |
| You Make My Dreams (`you_make_my_dreams`)                                           | 69           | 70                   | **1**    |             |

## 3. Repeats written out longhand — 240 songs

The page is shorter than the data because the book uses repeat signs and the
parser expanded them. Collapsing these back is mechanical and safe — the
performed order is provably unchanged — but it changes how the chart _reads_,
so say if you would rather any of them stayed long.

**A second cause lives in this list: charts written in half time.** 50 Ways To
Leave Your Lover was in this table at 79 against 48, and it was not longhand at
all — every bar held one chord that should have been two, so every bar was half
a bar. Halving it reproduced the page exactly. The tell is a ratio near 2:1 with
no repeated sections and nearly every bar holding a single whole-bar chord; on
those numbers fourteen others look the same, listed below. **I have not verified
them** — two spot-checks against the page were inconclusive, so treat this as a
place to look first, not a finding.

`brother_soul` · `la_vie_en_rose` · `something_just_like_this` ·
`say_it_aint_so` · `i_will` · `crazy_love` ·
`dont_worry_about_the_government` · `the_sign` · `handclap` · `good_times` ·
`aint_nobody` · `pastime_paradise` · `days_like_this` · `in_the_midnight_hour`

| Song                                                                 | Library bars | Page ~bars | Longhand by | Page has                             | Your answer                        |
| -------------------------------------------------------------------- | ------------ | ---------- | ----------- | ------------------------------------ | ---------------------------------- |
| Can’t Buy Me Love (`cant_buy_me_love`)                               | 187          | 81         | **106**     | 2 repeat dots                        |                                    |
| Don’t You Worry ‘Bout A Thing (`dont_you_worry_bout_a_thing`)        | 175          | 100        | **75**      | 8 repeat dots, 4x 4x                 |                                    |
| My Old Man (`my_old_man`)                                            | 142          | 68         | **74**      | 2 repeat dots                        |                                    |
| Takin’ It To The Streets (`takin_it_to_the_streets`)                 | 200          | 127        | **73**      | —                                    |                                    |
| The Seed 2.0 (`the_seed_2_0`)                                        | 163          | 93         | **70**      | 2 repeat dots, 4x 5x                 |                                    |
| FourFiveSeconds (`fourfiveseconds`)                                  | 122          | 62         | **60**      | 4 repeat dots                        |                                    |
| Midnight Train To Georgia (`midnight_train_to_georgia`)              | 120          | 60         | **60**      | 4 repeat dots                        |                                    |
| Higher Ground (`higher_ground`)                                      | 116          | 60         | **56**      | 8 repeat dots, 3x                    |                                    |
| Knocks Me Off My Feet (`knocks_me_off_my_feet`)                      | 122          | 66         | **56**      | 2 repeat dots                        |                                    |
| Feeling Alright (`feeling_alright`)                                  | 147          | 92         | **55**      | —                                    |                                    |
| HandClap (`handclap`)                                                | 119          | 64         | **55**      | 3 repeat dots                        |                                    |
| Paranoid Android (`paranoid_android`)                                | 143          | 88         | **55**      | 4 repeat dots, 3x                    |                                    |
| Africa (`africa`)                                                    | 140          | 87         | **53**      | 8 repeat dots, 4x                    |                                    |
| Feel Like Makin’ Love (`feel_like_makin_love`)                       | 116          | 64         | **52**      | 14 repeat dots, 4x 3x 3x             |                                    |
| Hard Rock Cafe (`hard_rock_cafe`)                                    | 124          | 72         | **52**      | 6 repeat dots, 5x                    |                                    |
| Oh! You Pretty Things (`oh_you_pretty_things`)                       | 98           | 46         | **52**      | 2 repeat dots                        |                                    |
| Saving All My Love For You (`saving_all_my_love_for_you`)            | 111          | 59         | **52**      | 2 repeat dots                        |                                    |
| You And I (`you_and_i`)                                              | 136          | 84         | **52**      | 2 repeat dots                        |                                    |
| Blackbird (`blackbird`)                                              | 87           | 36         | **51**      | 1 repeat dots                        |                                    |
| Till There Was You (`till_there_was_you`)                            | 115          | 64         | **51**      | —                                    |                                    |
| Eventually (`eventually`)                                            | 104          | 54         | **50**      | 2 repeat dots                        |                                    |
| Ain’t Nobody (`aint_nobody`)                                         | 108          | 59         | **49**      | 7 repeat dots, 4x, 1× 1st ending     |                                    |
| Wannabe (`wannabe`)                                                  | 101          | 52         | **49**      | 6 repeat dots, 4x                    |                                    |
| Drink In My Hand (`drink_in_my_hand`)                                | 116          | 68         | **48**      | 2 repeat dots                        |                                    |
| I Should Have Known Better (`i_should_have_known_better`)            | 124          | 76         | **48**      | 2 repeat dots                        |                                    |
| Rainy Days And Mondays (`rainy_days_and_mondays`)                    | 114          | 66         | **48**      | —                                    |                                    |
| Caravan (`caravan`)                                                  | 92           | 46         | **46**      | 6 repeat dots, 4x 4x                 |                                    |
| I Loved Her First (`i_loved_her_first`)                              | 100          | 54         | **46**      | 8 repeat dots                        |                                    |
| Kiss From A Rose (`kiss_from_a_rose`)                                | 125          | 79         | **46**      | —                                    |                                    |
| The Sign (`the_sign`)                                                | 88           | 42         | **46**      | 5 repeat dots                        |                                    |
| I Kissed A Girl (`i_kissed_a_girl`)                                  | 107          | 62         | **45**      | 1 repeat dots                        |                                    |
| Karma Police (`karma_police`)                                        | 88           | 44         | **44**      | 3 repeat dots                        |                                    |
| Burn This Disco Out (`burn_this_disco_out`)                          | 105          | 62         | **43**      | 11 repeat dots, 3x                   |                                    |
| Hit Me With Your Best Shot (`hit_me_with_your_best_shot`)            | 95           | 52         | **43**      | 4 repeat dots, 3x                    |                                    |
| Living For The City (`living_for_the_city`)                          | 136          | 93         | **43**      | 8 repeat dots                        |                                    |
| September (`september`)                                              | 101          | 58         | **43**      | 3 repeat dots                        |                                    |
| Sir Duke (`sir_duke`)                                                | 125          | 82         | **43**      | 3 repeat dots, 3x                    |                                    |
| 1612 (`1612`)                                                        | 148          | 106        | **42**      | 10 repeat dots, 3x 3x 3x             |                                    |
| Don’t Worry About The Government (`dont_worry_about_the_government`) | 88           | 46         | **42**      | 2 repeat dots                        |                                    |
| I Will (`i_will`)                                                    | 86           | 44         | **42**      | —                                    |                                    |
| Rolling In The Deep (`rolling_in_the_deep`)                          | 100          | 58         | **42**      | 10 repeat dots, 4x 4x                |                                    |
| Smells Like Teen Spirit (`smells_like_teen_spirit`)                  | 90           | 48         | **42**      | 10 repeat dots, 5x 3x 5x 3x 4x 5x 5x |                                    |
| 1999 (`1999`)                                                        | 92           | 52         | **40**      | 15 repeat dots, 5x 4x                |                                    |
| Ain’t No Mountain High Enough (`aint_no_mountain_high_enough`)       | 92           | 52         | **40**      | 6 repeat dots, 4x                    |                                    |
| Aladdin Sane (`aladdin_sane`)                                        | 115          | 75         | **40**      | 4 repeat dots                        |                                    |
| Love The One You’re With (`love_the_one_youre_with`)                 | 94           | 54         | **40**      | 4 repeat dots, 3x 3x                 |                                    |
| Luck Be A Lady (`luck_be_a_lady`)                                    | 127          | 87         | **40**      | 12 repeat dots, 4x 4x 4x 8x 4x       |                                    |
| Paper Bag (`paper_bag`)                                              | 104          | 64         | **40**      | 2 repeat dots, 3x                    |                                    |
| Smooth Operator (`smooth_operator`)                                  | 111          | 71         | **40**      | 16 repeat dots, 4x 4x                |                                    |
| Something Just Like This (`something_just_like_this`)                | 80           | 40         | **40**      | 11 repeat dots, 6x 4x 4x 4x          |                                    |
| Come And Get Your Love (`come_and_get_your_love`)                    | 84           | 46         | **38**      | 10 repeat dots, 3x 4x                |                                    |
| Canned Heat (`canned_heat`)                                          | 88           | 51         | **37**      | 12 repeat dots, 6x 4x                |                                    |
| Dear Prudence (`dear_prudence`)                                      | 90           | 53         | **37**      | 5 repeat dots                        |                                    |
| Homegrown (`homegrown`)                                              | 96           | 60         | **36**      | 1 repeat dots                        |                                    |
| Joy Inside My Tears (`joy_inside_my_tears`)                          | 91           | 55         | **36**      | 2 repeat dots, 4x                    |                                    |
| Wonderwall (`wonderwall`)                                            | 81           | 45         | **36**      | 4 repeat dots, 8x                    |                                    |
| Changes (`changes`)                                                  | 103          | 68         | **35**      | 2 repeat dots, 1× 1st ending         |                                    |
| Nothing Compares 2 U (`nothing_compares_2_u`)                        | 84           | 49         | **35**      | 6 repeat dots, 3x 3x                 |                                    |
| You’re My Best Friend (`youre_my_best_friend`)                       | 118          | 83         | **35**      | —                                    |                                    |
| Jump (`jump`)                                                        | 102          | 68         | **34**      | 14 repeat dots, 4x 4x                |                                    |
| Say It Ain’t So (`say_it_aint_so`)                                   | 65           | 32         | **33**      | 10 repeat dots, 4x 3x                |                                    |
| The Book I Read (`the_book_i_read`)                                  | 101          | 68         | **33**      | 10 repeat dots, 6x 6x                |                                    |
| Black Hole Sun (`black_hole_sun`)                                    | 88           | 56         | **32**      | 4 repeat dots, 6x                    |                                    |
| Down Under (`down_under`)                                            | 65           | 33         | **32**      | 12 repeat dots, 3x 3x                |                                    |
| Good Times (`good_times`)                                            | 60           | 28         | **32**      | 10 repeat dots, 6x 4x 4x 4x 4x       |                                    |
| Here Comes The Sun (`here_comes_the_sun`)                            | 119          | 87         | **32**      | 4 repeat dots, 5x                    |                                    |
| Rich Girl (`rich_girl`)                                              | 82           | 50         | **32**      | —                                    |                                    |
| Tears Of A Clown (`tears_of_a_clown`)                                | 78           | 46         | **32**      | 10 repeat dots, 4x 4x                |                                    |
| 50 Ways To Leave Your Lover (`50_ways_to_leave_your_lover`)          | 79           | 48         | **31**      | 2 repeat dots                        | **Done** — half time, not longhand |
| Don’t Know Why (`dont_know_why`)                                     | 85           | 54         | **31**      | 2 repeat dots, 1× 1st ending         |                                    |
| I Choose You (`i_choose_you`)                                        | 68           | 37         | **31**      | 6 repeat dots, 3x                    |                                    |
| Just The Two Of Us (`just_the_two_of_us`)                            | 83           | 52         | **31**      | 4 repeat dots                        |                                    |
| Power Of Love (`power_of_love`)                                      | 83           | 52         | **31**      | 4 repeat dots, 5x 3x 5x              |                                    |
| Thinking Out Loud (`thinking_out_loud`)                              | 75           | 44         | **31**      | 10 repeat dots, 4x 4x 4x 3x          |                                    |
| Ants Marching (`ants_marching`)                                      | 110          | 80         | **30**      | 12 repeat dots, 6x                   |                                    |
| How Come You Don’t Call Me (`how_come_you_dont_call_me`)             | 64           | 34         | **30**      | 4 repeat dots, 6x 5x 3x              |                                    |
| Beautiful (`beautiful`)                                              | 143          | 114        | **29**      | —                                    |                                    |
| Easy (`easy`)                                                        | 70           | 41         | **29**      | 6 repeat dots                        |                                    |
| Haven't Met You Yet (`havent_met_you_yet`)                           | 136          | 107        | **29**      | 2 repeat dots, 4x                    |                                    |
| She’s No Lady (`shes_no_lady`)                                       | 61           | 32         | **29**      | 1 repeat dots                        |                                    |
| …and 160 more                                                        |              |            |             |                                      |                                    |

## 4. Roadmap on the page, none in the data — 543 songs

Every one of these has repeat signs, endings or ×N counts printed in the book
and a completely flat chart in the library. The top 60 by how much is there:

| Song                                                                      | Page has                                         | Your answer |
| ------------------------------------------------------------------------- | ------------------------------------------------ | ----------- |
| Contusion (`contusion`)                                                   | 13 repeat dots, 6x 4x 4x 5x, 1st/2nd endings ×3  |             |
| Bustin’ Loose (`bustin_loose`)                                            | 20 repeat dots, 4x 4x 5x 8x                      |             |
| Crazy In Love (`crazy_in_love`)                                           | 13 repeat dots, 3x 2x 4x 4x 6x 5x 4x 4x 3x 2x 9x |             |
| Boogie Oogie Oogie (`boogie_oogie_oogie`)                                 | 14 repeat dots, 4x 4x 8x 6x 4x 4x                |             |
| Geronimo (`geronimo`)                                                     | 18 repeat dots, 4x 3x                            |             |
| The Big Country (`the_big_country`)                                       | 12 repeat dots, 6x 4x 4x 4x 4x 3x 4x 6x          |             |
| Le Freak (`le_freak`)                                                     | 12 repeat dots, 6x 4x 7x 4x 7x 8x 4x             |             |
| Californication (`californication`)                                       | 15 repeat dots, 3x 3x 3x                         |             |
| Let Me Clear My Throat (`let_me_clear_my_throat`)                         | 10 repeat dots, 7x 3x 3x 4x 3x 3x 5x 4x          |             |
| Livin’ La Vida Loca (`livin_la_vida_loca`)                                | 12 repeat dots, 5x 4x 4x 4x 8x 4x                |             |
| Oye Como Va (`oye_como_va`)                                               | 14 repeat dots, 4x 5x 6x 6x                      |             |
| Pulled Up (`pulled_up`)                                                   | 12 repeat dots, 4x 3x 3x, 1st/2nd endings ×1     |             |
| Shut Up And Dance (`shut_up_and_dance`)                                   | 10 repeat dots, 3x 4x, 1st/2nd endings ×2        |             |
| Smooth Operator (`smooth_operator`)                                       | 16 repeat dots, 4x 4x                            |             |
| Sweet Dreams (`sweet_dreams`)                                             | 14 repeat dots, 4x 3x 4x 4x                      |             |
| The Ocean (`the_ocean`)                                                   | 10 repeat dots, 4x 3x 4x 3x 4x 3x 3x 4x          |             |
| 1999 (`1999`)                                                             | 15 repeat dots, 5x 4x                            |             |
| Feel Like Makin’ Love (`feel_like_makin_love`)                            | 14 repeat dots, 4x 3x 3x                         |             |
| Let’s Go Crazy (`lets_go_crazy`)                                          | 12 repeat dots, 8x 4x 4x 4x 4x                   |             |
| Luck Be A Lady (`luck_be_a_lady`)                                         | 12 repeat dots, 4x 4x 4x 8x 4x                   |             |
| Smells Like Teen Spirit (`smells_like_teen_spirit`)                       | 10 repeat dots, 5x 3x 5x 3x 4x 5x 5x             |             |
| Somethin’ For Ya (`somethin_for_ya`)                                      | 10 repeat dots, 4x 4x 4x 4x 4x 4x 4x             |             |
| Superstition (`superstition`)                                             | 14 repeat dots, 4x 3x 3x                         |             |
| We Didn’t Start The Fire (`we_didnt_start_the_fire`)                      | 14 repeat dots, 4x 3x 4x                         |             |
| Firework (`firework`)                                                     | 12 repeat dots, 4x 4x 4x 4x                      |             |
| I’m Gonna Be (500 Miles) (`im_gonna_be_500_miles`)                        | 14 repeat dots, 4x 4x                            |             |
| Jump (`jump`)                                                             | 14 repeat dots, 4x 4x                            |             |
| Just Dance (`just_dance`)                                                 | 12 repeat dots, 3x 4x 3x 4x                      |             |
| Making Flippy Floppy (`making_flippy_floppy`)                             | 10 repeat dots, 8x 4x 4x 4x 8x 8x                |             |
| Tightrope (`tightrope`)                                                   | 13 repeat dots, 6x 4x 5x                         |             |
| Twisted (`twisted`)                                                       | 12 repeat dots, 4x 4x 4x 4x                      |             |
| Vivir Mi Vida (`vivir_mi_vida`)                                           | 12 repeat dots, 3x 4x 3x 6x                      |             |
| All I Wanna Do (`all_i_wanna_do`)                                         | 12 repeat dots, 5x 4x 4x, rit.                   |             |
| All The Small Things (`all_the_small_things`)                             | 12 repeat dots, 4x 3x 3x                         |             |
| Fire On The Bayou (`fire_on_the_bayou`)                                   | 14 repeat dots, 3x                               |             |
| Gimme Shelter (`gimme_shelter`)                                           | 12 repeat dots, 3x 6x 3x                         |             |
| Good Times (`good_times`)                                                 | 10 repeat dots, 6x 4x 4x 4x 4x                   |             |
| Psycho Killer (`psycho_killer`)                                           | 11 repeat dots, 3x, 1st/2nd endings ×1           |             |
| Single Ladies (`single_ladies`)                                           | 12 repeat dots, 5x 4x 3x                         |             |
| Something Just Like This (`something_just_like_this`)                     | 11 repeat dots, 6x 4x 4x 4x                      |             |
| Canned Heat (`canned_heat`)                                               | 12 repeat dots, 6x 4x                            |             |
| Down Under (`down_under`)                                                 | 12 repeat dots, 3x 3x                            |             |
| Dynamite (`dynamite`)                                                     | 8 repeat dots, 3x 4x 3x 4x 4x 5x                 |             |
| I Wish (`i_wish`)                                                         | 9 repeat dots, 4x 4x, 1st/2nd endings ×1         |             |
| Late In The Evening (`late_in_the_evening`)                               | 13 repeat dots, 3x                               |             |
| Never Gonna Give You Up (`never_gonna_give_you_up`)                       | 10 repeat dots, 3x 3x 4x 4x                      |             |
| Raise Your Glass (`raise_your_glass`)                                     | 9 repeat dots, 4x 4x 4x 4x 6x                    |             |
| Seven Nation Army (`seven_nation_army`)                                   | 10 repeat dots, 6x 4x 6x 6x                      |             |
| Thinking Out Loud (`thinking_out_loud`)                                   | 10 repeat dots, 4x 4x 4x 3x                      |             |
| Whip It (`whip_it`)                                                       | 10 repeat dots, 4x 4x 4x 3x                      |             |
| Will You Be There (`will_you_be_there`)                                   | 10 repeat dots, 4x 4x 4x 4x                      |             |
| With A Little Help From My Friends (`with_a_little_help_from_my_friends`) | 14 repeat dots                                   |             |
| 1612 (`1612`)                                                             | 10 repeat dots, 3x 3x 3x, fade out               |             |
| All Of Me (`all_of_me`)                                                   | 10 repeat dots, 4x 6x 4x                         |             |
| Ants Marching (`ants_marching`)                                           | 12 repeat dots, 6x                               |             |
| Black Dog (`black_dog`)                                                   | 12 repeat dots, 4x                               |             |
| China Girl (`china_girl`)                                                 | 11 repeat dots, 5x 3x                            |             |
| Fly Like An Eagle (`fly_like_an_eagle`)                                   | 13 repeat dots                                   |             |
| Gone Country (`gone_country`)                                             | 10 repeat dots, 4x 4x 4x                         |             |
| Happy (`happy`)                                                           | 8 repeat dots, 4x 4x 8x 8x 4x                    |             |

## 5. No chart found — 13 songs

Mostly alternate versions whose title matches a different chart in the book.

- another_day_lidell — “Another Day”
- born_under_punches_the_heat_goes_on — “Born Under Punches”
- cant_help_falling_in_love — “Can’t Help Falling In Love”
- cant_take_my_eyes_off_you_valli — “Can’t Take My Eyes Off You”
- forever_young_dylan — “Forever Young”
- forever_young_stewart — “Forever Young”
- killing_me_softly_flack — “Killing Me Softly”
- lady_marmalade_aguilera — “Lady Marmalade”
- no_diggity_blackstreet — “No Diggity”
- say_something_timberlake — “Say Something”
- thank_you — “Thank You”
- this_must_be_the_place — “This Must Be The Place”
- youve_got_a_friend_king — “You’ve Got A Friend”
